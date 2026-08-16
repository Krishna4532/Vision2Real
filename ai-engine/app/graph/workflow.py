from __future__ import annotations

import functools

from langgraph.graph import END, StateGraph

from app.graph.state import GraphState
from app.services.analysis_service import run_classification, run_idea_structuring, run_preflight
from app.services.llm_provider import BaseLLMProvider, get_llm_provider
from app.agents.research_agent import research_agent
from app.agents.competition_agent import competition_agent
from app.agents.customer_agent import customer_agent


async def pre_flight_node(state: GraphState) -> GraphState:
    state.preflight = run_preflight(state.raw_idea)
    state.current_stage = "pre_flight"
    if not state.preflight.is_valid:
        state.status = state.preflight.status
        # Preserve pre-flight concerns in the top-level error list so callers
        # that only read `errors` (not `preflight.concerns`) still see why.
        state.errors.extend(state.preflight.concerns)
        return state
    state.status = "in_progress"
    return state


async def idea_structuring_node(state: GraphState, llm_provider: BaseLLMProvider) -> GraphState:
    state.current_stage = "idea_structuring"
    try:
        state.structured_idea = await run_idea_structuring(state.raw_idea, llm_provider)
        state.status = "in_progress"
    except Exception as exc:  # noqa: BLE001
        state.errors.append(f"Idea structuring failed: {exc}")
        state.status = "degraded"
    return state


async def classification_node(state: GraphState, llm_provider: BaseLLMProvider) -> GraphState:
    state.current_stage = "classification"
    try:
        state.classification = await run_classification(state.raw_idea, llm_provider)
        state.status = "in_progress"
    except Exception as exc:  # noqa: BLE001
        state.errors.append(f"Classification failed: {exc}")
        state.status = "degraded"
    return state


async def combined_state_node(state: GraphState) -> GraphState:
    """Converge parallel agents and combine their errors and statuses."""
    state.current_stage = "combined_state"

    # Collect all agent errors
    if state.research_errors:
        state.errors.extend(state.research_errors)
    if state.competition_errors:
        state.errors.extend(state.competition_errors)
    if state.customer_errors:
        state.errors.extend(state.customer_errors)

    # Evaluate degraded states
    statuses = [state.research_status, state.competition_status, state.customer_status]

    if "failed" in statuses:
        # Hard failure in at least one agent → degraded
        state.status = "degraded"
    elif all(status == "success" for status in statuses):
        state.status = "completed"
    elif all(status in {"success", "partial"} for status in statuses):
        # All agents completed but some returned partial (e.g. ambiguous idea, not enough context)
        # This is expected for unclear/ambiguous ideas; use requires_clarification not degraded
        state.status = "requires_clarification"
    else:
        state.status = "degraded"

    return state



def build_graph(llm_provider: BaseLLMProvider | None = None) -> StateGraph:
    """Build the Phase 1 + Phase 2 graph, bound to a specific LLM provider.

    Previously idea_structuring_node/classification_node accepted an
    `llm_provider` kwarg with a default, but LangGraph only ever calls nodes
    as `node(state)` - it never passed that kwarg - so the parameter was
    silently unreachable and every run used a fresh MockLLMProvider(),
    regardless of what was configured or passed in by the caller. Binding the
    provider via functools.partial here makes it actually take effect.
    """
    provider = llm_provider or get_llm_provider()
    workflow = StateGraph(GraphState)

    # Phase 1 nodes
    workflow.add_node("pre_flight", pre_flight_node)
    workflow.add_node("idea_structuring", functools.partial(idea_structuring_node, llm_provider=provider))
    workflow.add_node("classification_step", functools.partial(classification_node, llm_provider=provider))
    
    # Phase 2 parallel nodes
    workflow.add_node("research_step", research_agent)
    workflow.add_node("competition_step", competition_agent)
    workflow.add_node("customer_step", customer_agent)
    
    # Phase 2 convergence node
    workflow.add_node("combined_state", combined_state_node)
    
    # Routing: pre_flight with rejection check
    def should_continue(state: GraphState) -> str:
        if not state.preflight or not state.preflight.is_valid:
            return END
        return "idea_structuring"
    
    workflow.set_entry_point("pre_flight")
    workflow.add_conditional_edges("pre_flight", should_continue, {"idea_structuring": "idea_structuring", END: END})
    
    # Linear flow: Phase 1
    workflow.add_edge("idea_structuring", "classification_step")
    
    # Parallel flow: Phase 2 (all three agents run in parallel after classification)
    workflow.add_edge("classification_step", "research_step")
    workflow.add_edge("classification_step", "competition_step")
    workflow.add_edge("classification_step", "customer_step")
    
    # Convergence after parallel execution
    workflow.add_edge("research_step", "combined_state")
    workflow.add_edge("competition_step", "combined_state")
    workflow.add_edge("customer_step", "combined_state")
    
    workflow.add_edge("combined_state", END)
    
    return workflow


async def run_graph(raw_idea: str, llm_provider: BaseLLMProvider | None = None) -> GraphState:
    workflow = build_graph(llm_provider)
    graph = workflow.compile()
    initial_state = GraphState(raw_idea=raw_idea)
    result = await graph.ainvoke(initial_state)
    return GraphState.model_validate(result)

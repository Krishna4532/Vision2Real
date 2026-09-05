from __future__ import annotations

import functools

from langgraph.graph import END, StateGraph

from app.core.logging import logger
from app.graph.state import GraphState
from app.graph.orchestrator import GraphOrchestrator, PipelineConfig
from app.services.analysis_service import run_classification, run_idea_structuring, run_preflight
from app.services.llm_provider import BaseLLMProvider, get_llm_provider
from app.services.status_rules import StatusDegradationRules
from app.agents.research_agent import research_agent
from app.agents.competition_agent import competition_agent
from app.agents.customer_agent import customer_agent
from app.agents.synthesis_agent import synthesis_agent
from app.agents.business_model_agent import business_model_agent
from app.agents.feasibility_agent import feasibility_agent
from app.agents.financial_agent import financial_agent
from app.agents.market_agent import market_agent
from app.agents.risk_agent import risk_agent
from app.agents.red_team_agent import red_team_agent
from app.agents.decision_agent import decision_gate_node, validation_plan_node


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
    """Converge parallel agents and combine their errors and statuses.
    
    Uses centralized StatusDegradationRules for consistent status evaluation.
    """
    state.current_stage = "combined_state"

    # Collect all agent errors
    if state.research_errors:
        state.errors.extend(state.research_errors)
    if state.competition_errors:
        state.errors.extend(state.competition_errors)
    if state.customer_errors:
        state.errors.extend(state.customer_errors)

    # Evaluate phase status using centralized rules
    agent_statuses = {
        "research": state.research_status or "pending",
        "competition": state.competition_status or "pending",
        "customer": state.customer_status or "pending",
    }
    
    phase_status, status_messages = StatusDegradationRules.evaluate_phase_status(
        "phase_2", agent_statuses
    )
    
    for msg in status_messages:
        logger.info(msg)
    
    # Update overall pipeline status
    old_status = state.status
    state.status = StatusDegradationRules.update_overall_pipeline_status(
        state.status, phase_status
    )
    
    StatusDegradationRules.log_status_transition(
        "phase_2", old_status, state.status, agent_statuses
    )

    return state


async def phase3_combined_state_node(state: GraphState) -> GraphState:
    """Converge the parallel Phase 3 agents (business_model, feasibility,
    market, risk - synthesis runs before them, sequentially, since they
    depend on it; Red Team runs after this node, since it needs their
    combined output to interrogate) and combine their errors/statuses,
    mirroring combined_state_node's Phase 2 pattern.
    
    Uses centralized StatusDegradationRules for consistent status evaluation.
    """
    state.current_stage = "phase3_combined_state"

    # Collect all phase 3 agent errors
    if state.synthesis_errors:
        state.errors.extend(state.synthesis_errors)
    if state.business_model_errors:
        state.errors.extend(state.business_model_errors)
    if state.feasibility_errors:
        state.errors.extend(state.feasibility_errors)
    if state.financial_errors:
        state.errors.extend(state.financial_errors)
    if state.market_errors:
        state.errors.extend(state.market_errors)
    if state.risk_errors:
        state.errors.extend(state.risk_errors)

    # Evaluate phase 3 status using centralized rules
    agent_statuses = {
        "synthesis": state.synthesis_status or "pending",
        "business_model": state.business_model_status or "pending",
        "feasibility": state.feasibility_status or "pending",
        "financial": state.financial_status or "pending",
        "market": state.market_status or "pending",
        "risk": state.risk_status or "pending",
    }
    
    phase_status, status_messages = StatusDegradationRules.evaluate_phase_status(
        "phase_3", agent_statuses
    )
    
    for msg in status_messages:
        logger.info(msg)
    
    state.phase3_status = phase_status
    
    # Update overall pipeline status
    old_status = state.status
    state.status = StatusDegradationRules.update_overall_pipeline_status(
        state.status, phase_status
    )
    
    StatusDegradationRules.log_status_transition(
        "phase_3", old_status, state.status, agent_statuses
    )

    return state


async def red_team_converge_node(state: GraphState) -> GraphState:
    """Fold Red Team's errors/status into the pipeline using centralized rules.
    
    Red Team runs sequentially AFTER phase3_combined_state_node, consuming its
    output, not in parallel with it (see build_graph's docstring/comments).
    """
    state.current_stage = "red_team_combined"

    if state.red_team_errors:
        state.errors.extend(state.red_team_errors)

    # Evaluate red team phase status
    agent_statuses = {"red_team": state.red_team_status or "pending"}
    phase_status, status_messages = StatusDegradationRules.evaluate_phase_status(
        "adversarial", agent_statuses
    )
    
    for msg in status_messages:
        logger.info(msg)
    
    # Update overall pipeline status
    old_status = state.status
    state.status = StatusDegradationRules.update_overall_pipeline_status(
        state.status, phase_status
    )
    
    StatusDegradationRules.log_status_transition(
        "adversarial", old_status, state.status, agent_statuses
    )

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

    # Phase 3 nodes: synthesis runs first (all downstream Phase 3 agents
    # consume its output), then business/feasibility/market/risk/financial run in
    # parallel, then converge, then Red Team runs (it needs their combined
    # output to interrogate), then the decision gate and validation plan.
    workflow.add_node("synthesis_step", synthesis_agent)
    workflow.add_node("business_model_step", business_model_agent)
    workflow.add_node("feasibility_step", feasibility_agent)
    workflow.add_node("financial_step", financial_agent)
    workflow.add_node("market_step", market_agent)
    workflow.add_node("risk_step", risk_agent)
    workflow.add_node("phase3_combined_state", phase3_combined_state_node)
    workflow.add_node("red_team_step", red_team_agent)
    workflow.add_node("red_team_combined_state", red_team_converge_node)
    workflow.add_node("decision_gate", decision_gate_node)
    workflow.add_node("validation_plan_step", validation_plan_node)

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
    
    # Phase 3: converge from Phase 2's combined_state into synthesis, then
    # fan out into business/feasibility/market/risk, then converge again,
    # then Red Team (adversarial second pass over their combined output),
    # then the decision gate and finally the validation plan.
    workflow.add_edge("combined_state", "synthesis_step")

    workflow.add_edge("synthesis_step", "business_model_step")
    workflow.add_edge("synthesis_step", "feasibility_step")
    workflow.add_edge("synthesis_step", "financial_step")
    workflow.add_edge("synthesis_step", "market_step")
    workflow.add_edge("synthesis_step", "risk_step")

    workflow.add_edge("business_model_step", "phase3_combined_state")
    workflow.add_edge("feasibility_step", "phase3_combined_state")
    workflow.add_edge("financial_step", "phase3_combined_state")
    workflow.add_edge("market_step", "phase3_combined_state")
    workflow.add_edge("risk_step", "phase3_combined_state")

    workflow.add_edge("phase3_combined_state", "red_team_step")
    workflow.add_edge("red_team_step", "red_team_combined_state")
    workflow.add_edge("red_team_combined_state", "decision_gate")
    workflow.add_edge("decision_gate", "validation_plan_step")
    workflow.add_edge("validation_plan_step", END)

    return workflow


async def run_graph(raw_idea: str, llm_provider: BaseLLMProvider | None = None) -> GraphState:
    workflow = build_graph(llm_provider)
    graph = workflow.compile()
    initial_state = GraphState(raw_idea=raw_idea)
    result = await graph.ainvoke(initial_state)
    return GraphState.model_validate(result)
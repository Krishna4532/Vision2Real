# Sprint 2C.3 - Next Steps (Quick Start Guide)

## Current Status
- ✅ All LLM providers implemented (OpenAI, Anthropic, Gemini)
- ✅ Tavily research provider implemented
- ✅ Agent services framework created with templates
- ✅ 4 critical agents upgraded to use real LLM reasoning
- ✅ Comprehensive documentation & roadmap provided

**Ready**: Core infrastructure is production-ready. Remaining work follows clear patterns.

---

## STEP 1: Complete Remaining Agents (30-60 minutes)

All remaining agents follow the same pattern as `market_agent.py`. Copy this pattern:

### Template for Each Agent

```python
# app/agents/YOUR_AGENT_agent.py
from app.services.llm_provider import get_llm_provider
from app.services.agent_services import analyze_YOUR_AGENT_with_llm

async def YOUR_AGENT_agent(state: GraphState) -> dict[str, Any]:
    try:
        if not state.structured_idea:
            return {"YOUR_AGENT_status": "failed", "YOUR_AGENT_errors": [...]}
        
        llm_provider = get_llm_provider()
        llm_analysis = await analyze_YOUR_AGENT_with_llm(
            idea_text=state.raw_idea or "",
            # Add appropriate inputs based on agent type
            llm_provider=llm_provider,
        )
        
        result = YourAgentResult(
            status=llm_analysis.get("status", "partial"),
            claims=llm_analysis.get("claims", []),
            # Map other fields from llm_analysis
        )
        
        return {
            "YOUR_AGENT_result": result,
            "YOUR_AGENT_status": result.status,
            "YOUR_AGENT_errors": result.errors,
        }
    except Exception as exc:
        logger.exception("Your agent failed")
        return {"YOUR_AGENT_status": "failed", "YOUR_AGENT_errors": [str(exc)]}
```

### Required Agents to Upgrade

#### 1. **Feasibility Agent** (app/agents/feasibility_agent.py)
- Service: `analyze_feasibility_with_llm(idea_text, solution, technology_hints, llm_provider)`
- Result: `FeasibilityResult` (already defined in schemas/phase3.py)
- Status in workflow: feasibility_status, feasibility_result, feasibility_errors

Copy from: `market_agent.py` (use same structure)

#### 2. **Risk Agent** (app/agents/risk_agent.py)
- Service: Need to ADD `analyze_risk_with_llm()` to agent_services.py
- Result: `RiskResult` (already defined)
- Status in workflow: risk_status, risk_result, risk_errors

Key input: All upstream results (research, competition, customer, etc.)

#### 3. **Red Team Agent** (app/agents/red_team_agent.py)
- Service: Need to ADD `analyze_red_team_with_llm()` to agent_services.py
- Result: `RedTeamResult` (already defined)
- Status in workflow: red_team_status, red_team_result, red_team_errors

Key input: All upstream analysis results

#### 4. **Validation Plan Agent** (NEW - app/agents/validation_plan_agent.py)
- Service: Need to ADD `analyze_validation_with_llm()` to agent_services.py
- Result: `ValidationPlan` (already defined)
- Status in workflow: validation_plan (new field to add to GraphState)

Key input: Identified risks and unknowns from upstream

---

## STEP 2: Add Missing LLM Services (20-30 minutes)

Add these three functions to `app/services/agent_services.py`:

### Template Service Function

```python
async def analyze_YOUR_SERVICE_with_llm(
    idea_text: str,
    # Add other inputs as needed
    llm_provider: BaseLLMProvider,
) -> dict[str, Any]:
    """Use LLM to analyze YOUR_SERVICE aspects."""
    
    prompt = f"""Your analysis prompt for the LLM...
    
    Idea: {idea_text}
    ...
    """
    
    system_prompt = """You are a YOUR_SERVICE expert..."""
    
    try:
        result = await llm_provider.generate_structured(
            prompt,
            YourServiceOutput,  # The Pydantic schema
            system_prompt=system_prompt,
        )
        
        claims = []
        # Create claims from LLM output
        # Example:
        # claims.append(_create_claim(
        #     f"Risk: {risk.risk_statement}",
        #     "market_trend",
        #     "hypothesis",
        #     agent="YOUR_SERVICE",
        # ))
        
        return {
            "status": "success",
            "claims": claims,
            # Add other relevant outputs
        }
    except Exception as exc:
        logger.exception("YOUR_SERVICE analysis LLM call failed")
        return {
            "status": "failed",
            "error": f"Analysis failed: {exc}",
        }
```

### Services to Add (in order of priority)

1. **analyze_risk_with_llm()**
   - Inputs: idea_text, upstream_results (research, competition, customer, business_model)
   - Schema: `RiskAnalysisOutput` (already defined - create if missing)
   - Output: Risk items with category, severity, likelihood, mitigation

2. **analyze_red_team_with_llm()**
   - Inputs: idea_text, all upstream analysis results
   - Schema: `RedTeamAnalysisOutput` (already defined)
   - Output: Objections, fatal flaws, reasons for failure

3. **analyze_validation_with_llm()**
   - Inputs: idea_text, identified_risks, unknowns
   - Schema: `ValidationPlanOutput` (already defined)
   - Output: Critical unknowns, experiments, success criteria

---

## STEP 3: Test Everything (20-30 minutes)

### Quick Test Script

```python
import asyncio
from app.services.llm_provider import get_llm_provider

async def test_agents():
    llm = get_llm_provider()
    
    # Test each agent
    from app.agents.market_agent import market_agent
    from app.graph.state import GraphState
    from app.schemas.analysis import StructuredIdea
    
    state = GraphState(
        raw_idea="AI-powered tutoring platform",
        structured_idea=StructuredIdea(
            problem="Students need affordable tutoring",
            solution="AI tutor adapts to learning style",
            target_customer="College students",
            industry_category="EdTech",
        ),
    )
    
    result = await market_agent(state)
    print(f"Market Agent Status: {result['market_status']}")
    print(f"Claims Generated: {len(result['market_result'].claims)}")

if __name__ == "__main__":
    asyncio.run(test_agents())
```

### Run with Different Providers

```bash
# Test with OpenAI
export VISION2REAL_LLM_PROVIDER=openai
python test_agents.py

# Test with Anthropic
export VISION2REAL_LLM_PROVIDER=anthropic
python test_agents.py

# Test with mock (no API key needed)
export VISION2REAL_LLM_PROVIDER=mock
python test_agents.py
```

---

## STEP 4: Update Decision Agent (10-15 minutes)

The decision agent is in `app/agents/decision_agent.py`. It needs minor updates:

1. Add LLM call for decision recommendation (optional but recommended)
2. Use final confidence score from all upstream agents
3. Generate rationale based on all upstream results

Current code should work mostly as-is, but can be enhanced with:

```python
# Add to decision_gate_node function
from app.services.llm_provider import get_llm_provider

llm_provider = get_llm_provider()
# Use all state results to generate decision recommendation
# Then apply deterministic rules on top
```

---

## STEP 5: Optional - Document Intelligence (Optional, 20-30 min)

Create `app/agents/document_agent.py` to extract from uploaded PDFs/DOCX:

```python
async def document_agent(state: GraphState) -> dict[str, Any]:
    """Extract structured information from uploaded documents."""
    
    if not state.document_file_path:
        return {"document_status": "pending", "document_errors": []}
    
    from app.utils.document_parsing import extract_text_from_file
    
    text = await extract_text_from_file(state.document_file_path)
    
    # Use LLM to structure extracted content
    llm = get_llm_provider()
    result = await llm.generate_structured(
        f"Extract structured information from this document:\n{text}",
        StructuredIdea,
    )
    
    return {"document_result": result, "document_status": "success"}
```

Then add to workflow in `app/graph/workflow.py`:
```python
async def document_node(state: GraphState) -> GraphState:
    result = await document_agent(state)
    state.document_result = result.get("document_result")
    return state
```

---

## STEP 6: Run Full Test Suite

```bash
# Install dependencies
pip install -r requirements.txt

# Run existing tests (should all pass)
pytest tests/ -v

# Run specific agent tests
pytest tests/test_phase_2.py -v  # Market, Competition, Customer
pytest tests/test_phase_3.py -v  # Business Model, etc.
```

---

## STEP 7: Deploy & Monitor

1. **Set environment variables in production**:
```bash
export VISION2REAL_LLM_PROVIDER=openai
export VISION2REAL_LLM_MODEL=gpt-4o
export VISION2REAL_OPENAI_API_KEY=...
export VISION2REAL_RESEARCH_PROVIDER=tavily
export VISION2REAL_TAVILY_API_KEY=...
```

2. **Monitor LLM performance**:
   - Add logging to track LLM call latency
   - Monitor API costs
   - Track failure rates

3. **Gradual rollout**:
   - Start with 10% of requests using new agents
   - Monitor for issues
   - Gradually increase to 100%

---

## File Checklist

**Already Complete:**
- ✅ app/services/llm_provider.py - All 3 providers
- ✅ app/services/research_provider.py - Tavily
- ✅ app/utils/document_parsing.py - All utilities
- ✅ app/services/agent_services.py - Base services + 5 functions
- ✅ app/agents/market_agent.py - Upgraded
- ✅ app/agents/competition_agent.py - Upgraded
- ✅ app/agents/customer_agent.py - Upgraded
- ✅ app/agents/business_model_agent.py - Upgraded

**To Complete:**
- [ ] Add 3 more analyze_* functions to agent_services.py
- [ ] Upgrade app/agents/feasibility_agent.py
- [ ] Upgrade app/agents/risk_agent.py
- [ ] Upgrade app/agents/red_team_agent.py
- [ ] Create app/agents/validation_plan_agent.py
- [ ] Update app/agents/decision_agent.py
- [ ] (Optional) Create app/agents/document_agent.py
- [ ] Run tests and verify

---

## Estimated Time to Completion

- Add missing LLM services: **20-30 min**
- Upgrade remaining 3 agents: **15-20 min**
- Create validation plan agent: **15-20 min**
- Create document agent (optional): **20 min**
- Testing: **20-30 min**
- **Total: 90-150 minutes (~2-2.5 hours)**

---

## Need Help?

Reference files:
1. `SPRINT_2C3_COMPLETION.md` - Full implementation summary
2. `IMPLEMENTATION_ROADMAP.md` - Detailed upgrade patterns
3. `app/services/agent_services.py` - All output schemas
4. `app/agents/market_agent.py` - Perfect template to copy
5. `app/services/llm_provider.py` - How LLM calls work

All code is well-documented with docstrings and type hints.

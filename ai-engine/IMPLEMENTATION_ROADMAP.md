"""IMPLEMENTATION GUIDE: Upgrading Remaining Agents to Real LLM Reasoning

This guide provides the pattern for upgrading the remaining agents (business_model, feasibility, risk, red_team, validation_plan) to use real LLM reasoning instead of templates.

## Pattern

Each agent should follow this structure:

```python
from app.services.llm_provider import get_llm_provider
from app.services.agent_services import analyze_<agent>_with_llm

async def <agent>_agent(state: GraphState) -> dict[str, Any]:
    try:
        if not state.structured_idea:
            return {"<agent>_status": "failed", "<agent>_errors": ["No structured idea"]}
        
        # Call LLM analysis service
        llm_provider = get_llm_provider()
        llm_analysis = await analyze_<agent>_with_llm(
            idea_text=state.raw_idea,
            ... # other required inputs
            llm_provider=llm_provider,
        )
        
        # Build result from analysis
        result = <Agent>Result(
            status=llm_analysis.get("status", "partial"),
            claims=llm_analysis.get("claims", []),
            ... # map other fields from llm_analysis
        )
        
        return {
            "<agent>_result": result,
            "<agent>_status": result.status,
            "<agent>_errors": result.errors,
        }
    except Exception as exc:
        logger.exception("<Agent> agent failed")
        return {"<agent>_status": "failed", "<agent>_errors": [str(exc)]}
```

## Agents to Upgrade

### 1. Business Model Agent (app/agents/business_model_agent.py)
- Use: analyze_business_model_with_llm
- Inputs: idea_text, target_customer, value_proposition
- Output: BusinessModelResult
- Key: Avoid fabricating CAC/LTV - mark as UNKNOWN if not from evidence

### 2. Feasibility Agent (app/agents/feasibility_agent.py)
- Use: analyze_feasibility_with_llm
- Inputs: idea_text, solution, technology_hints
- Output: FeasibilityResult
- Key: Realistic timeline estimates, technology stack recommendations

### 3. Financial Agent (app/agents/financial_agent.py) - NEW
- Service needed: analyze_financial_with_llm (add to agent_services.py)
- Inputs: idea_text, revenue_model, target_market
- Output: FinancialResult (create schema in phase3.py)
- Key: Revenue/cost estimates, burn rate, funding need

### 4. Risk Agent (app/agents/risk_agent.py)
- Service needed: analyze_risk_with_llm (add to agent_services.py)
- Inputs: idea_text, all upstream results
- Output: RiskResult
- Key: FACT/INFERENCE/HYPOTHESIS classification, severity/likelihood

### 5. Red Team Agent (app/agents/red_team_agent.py)
- Service needed: analyze_red_team_with_llm (add to agent_services.py)
- Inputs: idea_text, all upstream analysis
- Output: RedTeamResult
- Key: Actively challenge assumptions, identify fatal flaws

### 6. Validation Plan Agent (app/agents/validation_plan_agent.py) - NEW
- Service needed: analyze_validation_with_llm (add to agent_services.py)
- Inputs: idea_text, risks, unknowns
- Output: ValidationPlan
- Key: Actionable experiments with clear success criteria

### 7. Decision Agent (app/agents/decision_agent.py) - UPDATE
- Already exists, update synthesis logic in decision_gate_node
- Use all upstream results to make BUILD/VALIDATE_MORE/PIVOT/REJECT decision
- Keep deterministic rules but add LLM confidence scoring

## Steps to Complete

1. **Add Missing LLM Services** (to agent_services.py):
   - analyze_financial_with_llm()
   - analyze_risk_with_llm()
   - analyze_red_team_with_llm()
   - analyze_validation_with_llm()

2. **Add Missing Schemas** (to schemas/phase3.py):
   - FinancialResult (if not already present)
   - Update existing schemas with FinancialAnalysisOutput, etc.

3. **Upgrade Each Agent** (following the pattern above):
   - business_model_agent.py
   - feasibility_agent.py
   - risk_agent.py
   - red_team_agent.py
   - validation_plan_agent.py (new file)
   - decision_agent.py (update synthesis)

4. **Add Document Intelligence Agent** (new):
   - app/agents/document_agent.py
   - Process uploaded PDF/DOCX files
   - Extract structured information
   - Feed into idea_structuring

5. **Testing**:
   - Test each agent with real LLM provider
   - Test with mock provider for CI/CD
   - Verify evidence chain and citations
   - Test error handling

## Environment Setup

To test with real providers:

```bash
# OpenAI
export VISION2REAL_LLM_PROVIDER=openai
export VISION2REAL_LLM_MODEL=gpt-4o-mini
export VISION2REAL_OPENAI_API_KEY=...

# Anthropic
export VISION2REAL_LLM_PROVIDER=anthropic
export VISION2REAL_LLM_MODEL=claude-opus-4-1
export VISION2REAL_ANTHROPIC_API_KEY=...

# Tavily
export VISION2REAL_RESEARCH_PROVIDER=tavily
export VISION2REAL_TAVILY_API_KEY=...
```

## Key Principles

1. **Honesty about provenance**: Every claim includes source information
2. **No fabrication**: Mark unknowns as UNKNOWN rather than guessing
3. **Structured output**: All LLM outputs validated against Pydantic schemas
4. **Evidence chain**: Every claim traces back to evidence or clear reasoning
5. **Confidence scoring**: Not hardcoded - derived from claim status
6. **Error handling**: Graceful degradation if LLM calls fail

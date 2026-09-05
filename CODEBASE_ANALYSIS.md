# Vision2Real AI-Engine Codebase Analysis
**Generated:** 2026-08-31

---

## 1. AGENT IMPLEMENTATIONS (app/agents/)

### Overview
**Total Agents:** 11 files  
**Pattern:** Mix of LLM-based (async) and deterministic (rules-based) agents

| Agent | File | Type | LLM-Based? | Service Function | Status |
|-------|------|------|-----------|-----------------|--------|
| Business Model | `business_model_agent.py` | Phase 3 | ✅ LLM-based | `analyze_business_model_with_llm()` | COMPLETE |
| Market/Industry | `market_agent.py` | Phase 3 | ✅ LLM-based | `analyze_market_with_llm()` | COMPLETE |
| Competition | `competition_agent.py` | Phase 3 | ✅ LLM-based | `analyze_competition_with_llm()` | COMPLETE |
| Customer | `customer_agent.py` | Phase 3 | ✅ LLM-based | `analyze_customer_with_llm()` | COMPLETE |
| Feasibility | `feasibility_agent.py` | Phase 3 | ✅ LLM-based (optional) | `analyze_feasibility_with_llm()` | COMPLETE |
| Risk | `risk_agent.py` | Phase 3 | ✅ LLM-based (optional) | `analyze_risk_with_llm()` | COMPLETE |
| Red Team | `red_team_agent.py` | Phase 3 | ✅ LLM-based (optional) | `analyze_red_team_with_llm()` | COMPLETE |
| Research | `research_agent.py` | Phase 2 | ⚙️ Provider-based | Uses `research_provider` | COMPLETE |
| Synthesis | `synthesis_agent.py` | Phase 3 | ❌ Deterministic | N/A (templates only) | COMPLETE |
| Decision Gate | `decision_agent.py` | Phase 3 | ❌ Deterministic Rules | `decide()` from `decision_rules.py` | COMPLETE |
| Validation Plan | `validation_plan_agent.py` | Phase 3 | ✅ Hybrid | `analyze_validation_with_llm()` (fallback to deterministic) | COMPLETE |

---

## 2. AGENT DETAILS

### **Business Model Agent** ✅ LLM-BASED
**Purpose:** Analyze revenue models, pricing strategies, cost drivers, business viability  
**Implementation:**
- Calls `analyze_business_model_with_llm()`
- Inputs: `idea.target_customer`, `idea.solution` (value proposition)
- Outputs: `BusinessModelResult` with revenue model, pricing, unit economics
- Status markers: ASSUMED (LLM-generated, not market-verified)

**Note:** ⚠️ **SCHEMA MISMATCH** - Agent tries to set `claims` field that doesn't exist in `BusinessModelResult` schema

---

### **Market Agent** ✅ LLM-BASED
**Purpose:** Analyze market existence, category, dynamics, demand signals, geography, regulatory context  
**Implementation:**
- Calls `analyze_market_with_llm()`
- Inputs: `idea.industry_category`, research claims from upstream agents
- Outputs: `MarketResult` with market existence basis (VERIFIED/INFERRED/ASSUMED), signals, maturity
- Combines LLM analysis with evidence-based claims from research/competition/customer agents
- Never invents market size figures (explicitly avoided per spec)

---

### **Competition Agent** ✅ LLM-BASED
**Purpose:** Identify direct/indirect competitors, market gaps, differentiation strategy  
**Implementation:**
- Calls `analyze_competition_with_llm()`
- Inputs: `idea.industry_category`, `idea.target_customer`
- Outputs: `CompetitionResult` with competitors list, market gaps, differentiation claims
- Generates hypothesis-level claims marked as LLM-generated

---

### **Customer Agent** ✅ LLM-BASED
**Purpose:** Analyze customer personas, ICPs, pain points, jobs-to-be-done, adoption barriers  
**Implementation:**
- Calls `analyze_customer_with_llm()`
- Inputs: `idea.target_customer`, `idea.problem`
- Outputs: `CustomerResult` with personas, ICP, market segments as claims
- Creates detailed persona profiles with pain points, goals, buying motivation, WTP

---

### **Feasibility Agent** ✅ HYBRID (Deterministic + Optional LLM)
**Purpose:** Assess technical complexity, MVP scope, dependencies, regulatory/operational requirements  
**Implementation:**
- Primary: Deterministic category assessments based on heuristics:
  - AI/ML signal → HIGH complexity
  - Regulated industry check → ELEVATED regulatory level
  - Data requirements inference from industry
- Secondary: Calls `analyze_feasibility_with_llm()` (optional, if provider available)
- Outputs: `FeasibilityResult` with category assessments (LOW/MEDIUM/HIGH/UNKNOWN)
- **Explicitly avoids** detailed implementation architecture (out of scope for Phase 3)

---

### **Risk Agent** ✅ HYBRID (Deterministic + Optional LLM)
**Purpose:** Identify unresolved risks, classify by severity/likelihood, propose mitigations  
**Implementation:**
- Primary: Converts negative-status claims (hypothesis/inference) into RiskItems
- Secondary: Calls `analyze_risk_with_llm()` (optional LLM enrichment)
- Outputs: `RiskResult` with classified risks (FACT/INFERENCE/HYPOTHESIS)
- **Rule:** Every risk carries evidence_ids or is classified as HYPOTHESIS/INFERENCE
- Never presents unsupported claims as facts

---

### **Red Team Agent** ✅ LLM-BASED + DETERMINISTIC
**Purpose:** Actively challenge assumptions across customer adoption, market, competition, product, business  
**Implementation:**
- Calls `analyze_red_team_with_llm()` for adversarial objections
- Also generates deterministic findings from missing/weak evidence
- Inputs: Results from Synthesis, Business Model, Feasibility, Market, Risk (runs AFTER these)
- Outputs: `RedTeamResult` with findings classified as FACT/INFERENCE/HYPOTHESIS
- Flags potentially fatal findings that alone invalidate the idea
- **Deliberately deterministic for adversarial reasoning** (never softened by LLM)

---

### **Research Agent** ⚙️ PROVIDER-BASED (Phase 2)
**Purpose:** Investigate market, industry, trends, technology, regulatory landscape  
**Implementation:**
- Uses pluggable `research_provider` (configured via `get_research_provider()`)
- Calls `conduct_research()` via research service
- Inputs: `idea.industry_category`, classification labels
- Outputs: `ResearchResult` with claims, sources, findings
- **Note:** Not an LLM call directly; uses external research provider (possibly Tavily, web search, etc.)

---

### **Synthesis Agent** ❌ DETERMINISTIC (No LLM)
**Purpose:** Combine structured idea, classification, and upstream findings into evidence-grounded synthesis  
**Implementation:**
- **Deliberately NO LLM call** - every statement traceable to claims/evidence/sources
- Enforces "never present unsupported assumptions as verified facts" by template-based construction
- Outputs: `SynthesisResult` with:
  - Executive summary (what it is, who it serves, problem, value creation)
  - Evidence confidence score (weighted by claim status: supported=1.0, inference=0.6, hypothesis=0.3)
  - Key insights with basis (VERIFIED/INFERRED/ASSUMED/UNKNOWN)
  - Inputs used vs. inputs missing tracking

---

### **Decision Gate** ❌ DETERMINISTIC RULES
**Purpose:** Apply deterministic rules to decide: BUILD / VALIDATE_MORE / PIVOT / REJECT  
**Implementation:**
- Calls `decide()` from `app.services.decision_rules` (pure deterministic function)
- Inputs: All Phase 3 results (synthesis, business model, feasibility, risk, red team)
- Outputs: `DecisionResult` with:
  - Final decision (BUILD/VALIDATE_MORE/PIVOT/REJECT)
  - Rule trace (which rules fired, rationale)
  - Confidence score
  - Conservative override flags (downgrades BUILD→VALIDATE_MORE if analysis degraded)
- **Non-binding LLM proposal** field exists but deterministic code has final say

---

### **Validation Plan Agent** ✅ HYBRID (Deterministic + LLM)
**Purpose:** Generate prioritized validation experiments to resolve unknowns  
**Implementation:**
- Primary: Deterministic plan from `idea.unknowns`
- Secondary: Calls `analyze_validation_with_llm()` to enrich with LLM-generated experiments
- Outputs: `ValidationPlan` with items (question, why_it_matters, method, success_criteria, priority)
- Falls back gracefully to deterministic if LLM unavailable

---

## 3. SERVICE FUNCTIONS IN app/services/agent_services.py

### Available analyze_*_with_llm Functions

| Function Name | Exists? | Takes LLM Provider? | Return Fields |
|---------------|---------|-------------------|----------------|
| `analyze_market_with_llm()` | ✅ | Yes | status, claims, market_maturity, market_category, geography |
| `analyze_competition_with_llm()` | ✅ | Yes | status, claims, competitors, differentiation |
| `analyze_customer_with_llm()` | ✅ | Yes | status, claims, personas, icp |
| `analyze_business_model_with_llm()` | ✅ | Yes | status, claims, revenue_model, pricing, unit_economics |
| `analyze_feasibility_with_llm()` | ✅ | Yes | status, claims, complexity, timeline, tech_stack |
| `analyze_financial_with_llm()` | ✅ | Yes | status, claims, financial (full output object) |
| `analyze_risk_with_llm()` | ✅ | Yes | status, claims, risks |
| `analyze_red_team_with_llm()` | ✅ | Yes | status, claims, objections |
| `analyze_validation_with_llm()` | ✅ | Yes | status, claims, plan |

### Helper Functions
- `_create_claim()` - Factory for creating Claim objects with evidence
- All functions return `dict[str, Any]` with structured status and error handling

---

## 4. FINANCIAL ANALYSIS

### Current State: ✅ IMPLEMENTED

**Function:** `analyze_financial_with_llm()`

**Exists?** YES

**Implementation:**
```python
async def analyze_financial_with_llm(
    idea_text: str,
    market_context: str,
    revenue_model: str,
    llm_provider: BaseLLMProvider | None = None,
) -> dict[str, Any]
```

**Output Schema:** `FinancialAnalysisOutput` with:
- `startup_costs` (string, directional estimate)
- `year1_revenue_estimate`
- `year3_revenue_estimate`
- `gross_margin_estimate`
- `burn_rate_estimate`
- `runway_months`
- `funding_requirement`
- `break_even_timeline`
- `key_assumptions` (list - explicitly documented)
- `reasoning`

**Key Design Choices:**
- **Qualitative/directional estimates only** - explicitly avoids fabricating precise numbers
- System prompt: *"Give directional estimates and explicit assumptions, not made-up precise numbers"*
- Prefers ranges and descriptions when confidence is low
- All outputs have `reasoning` field to explain assumptions

**Status:** ⚠️ **NOT INTEGRATED INTO WORKFLOW**
- Function exists but no agent calls it
- No financial agent in the pipeline
- `FinancialAnalysisOutput` not mapped to Phase 3 schema

---

## 5. DECISION AGENT ANALYSIS

### Current State: ✅ DETERMINISTIC RULES-BASED (NO LLM)

**Files:**
- `decision_agent.py` - Contains `decision_gate_node()` and `validation_plan_node()`
- `app/services/decision_rules.py` - Contains pure `decide()` function

**Implementation:**
```python
async def decision_gate_node(state: GraphState) -> dict[str, Any]:
    # Calls pure deterministic decide() function
    decision_result = decide(
        synthesis, business_model, feasibility, risk, red_team, state.status
    )
```

**Decision Logic:**
- Pure deterministic rules in `decision_rules.py`
- Rule trace captured for auditability
- Takes best/worst evidence levels from each component
- No LLM involved in final decision

**Optional LLM Field:**
- `DecisionResult.llm_proposed_decision` exists but is **non-binding**
- Deterministic code always has final say
- Marked as "non-binding" in schema docstring

**Confidence & Conservative Override:**
- Calculates confidence score (0.0-1.0)
- Flags `is_conservative_override = True` when decision is downgraded
  - Example: BUILD → VALIDATE_MORE if analysis is degraded or missing critical components

**Validation Plan:**
- If decision is `VALIDATE_MORE`, generates prioritized validation items
- Maps each unknown to concrete next step
- Created from unknowns + risks flagged during analysis

---

## 6. SCHEMA DEFINITIONS (app/schemas/phase3.py)

### Result Schemas by Agent

| Agent | Schema | Fields |
|-------|--------|--------|
| **Synthesis** | `SynthesisResult` | status, executive_summary, what_it_is, who_it_serves, problem_solved, value_creation, current_evidence_strength (EvidenceBasis), key_insights[], evidence_confidence, inputs_used, inputs_missing, errors |
| **Business Model** | `BusinessModelResult` | status, revenue_model (ValuedField), pricing_assumptions[], cost_drivers[], unit_economics[], monetization_options[], strengths[], weaknesses[], errors |
| **Feasibility** | `FeasibilityResult` | status, product (ProductSummary), technical_feasibility (LOW/MEDIUM/HIGH/UNKNOWN), category_assessments[], errors |
| **Market** | `MarketResult` | status, market_exists (EvidenceBasis), market_category, market_maturity (NASCENT/GROWING/MATURE/DECLINING/UNKNOWN), geography, signals[], segments[], errors |
| **Risk** | `RiskResult` | status, risks[], critical_unresolved_risk_ids[], errors |
| **Red Team** | `RedTeamResult` | status, findings[], strongest_objection_id, weakest_assumption_id, potentially_fatal_finding_ids[], missing_decision_critical_evidence[], critical_finding_ids[], errors |
| **Decision** | `DecisionResult` | decision (BUILD/VALIDATE_MORE/PIVOT/REJECT), llm_proposed_decision, rationale[], rule_trace[], confidence, is_conservative_override |
| **Validation Plan** | `ValidationPlan` | generated (bool), items[] |

### Key Schema Components

**ValuedField** (used by Business Model)
```python
class ValuedField(BaseModel):
    label: str
    value: str | float | None
    basis: EvidenceBasis  # VERIFIED/INFERRED/ASSUMED/UNKNOWN
    evidence_ids: list[str]
    notes: str | None
```

**MarketSignal** (used by Market Agent)
```python
class MarketSignal(BaseModel):
    category: Literal["market_existence", "demand_signal", "growth_signal", "regulatory_context", ...]
    statement: str
    basis: EvidenceBasis  # VERIFIED/INFERRED/ASSUMED/UNKNOWN
    evidence_ids: list[str]
    claim_ids: list[str]
```

**RiskItem** (used by Risk Agent)
```python
class RiskItem(BaseModel):
    id: str | None
    risk_statement: str
    category: RiskCategory  # MARKET/CUSTOMER/COMPETITION/TECHNICAL/FINANCIAL/REGULATORY/OPERATIONAL
    severity: RiskSeverity  # LOW/MEDIUM/HIGH/CRITICAL
    likelihood: RiskLikelihood  # LOW/MEDIUM/HIGH/UNKNOWN
    classification: RiskClassification  # FACT/INFERENCE/HYPOTHESIS (NEVER fact without evidence_ids)
    evidence_ids: list[str]
    claim_ids: list[str]
    mitigation: str
    falsification_criteria: str
```

**RedTeamFinding** (used by Red Team Agent)
```python
class RedTeamFinding(BaseModel):
    id: str | None
    assumption_challenged: str
    objection: str
    category: RedTeamCategory  # CUSTOMER_ADOPTION/MARKET/COMPETITION/PRODUCT/TECHNICAL/BUSINESS_MODEL/OPERATIONAL/REGULATORY/EXECUTION
    severity: RedTeamSeverity  # LOW/MEDIUM/HIGH/CRITICAL
    classification: RiskClassification  # FACT/INFERENCE/HYPOTHESIS
    is_potentially_fatal: bool
    evidence_ids: list[str]
    claim_ids: list[str]
    falsification_criteria: str
```

**FounderDecisionBrief** (top-level aggregate)
```python
class FounderDecisionBrief(BaseModel):
    analysis_id: str | None
    synthesis: SynthesisResult | None
    business_model: BusinessModelResult | None
    feasibility: FeasibilityResult | None
    market: MarketResult | None
    risk: RiskResult | None
    red_team: RedTeamResult | None
    decision: DecisionResult | None
    validation_plan: ValidationPlan | None
    generated_at: str | None
```

---

## 7. IMPLEMENTATION COMPLETENESS MATRIX

| Component | Exists? | LLM-Based? | Integrated? | Schema Match? | Status |
|-----------|---------|-----------|-------------|---------------|--------|
| Business Model Agent | ✅ | ✅ | ✅ | ❌ MISMATCH | WORKING (claims field missing) |
| Market Agent | ✅ | ✅ | ✅ | ✅ | COMPLETE |
| Competition Agent | ✅ | ✅ | ✅ | ✅ | COMPLETE |
| Customer Agent | ✅ | ✅ | ✅ | ✅ | COMPLETE |
| Feasibility Agent | ✅ | ✅ Hybrid | ✅ | ✅ | COMPLETE |
| Risk Agent | ✅ | ✅ Hybrid | ✅ | ✅ | COMPLETE |
| Red Team Agent | ✅ | ✅ | ✅ | ✅ | COMPLETE |
| Research Agent | ✅ | ⚙️ Provider | ✅ | ✅ | COMPLETE |
| Synthesis Agent | ✅ | ❌ | ✅ | ✅ | COMPLETE |
| Decision Gate | ✅ | ❌ | ✅ | ✅ | COMPLETE |
| Validation Plan Agent | ✅ | ✅ Hybrid | ✅ | ✅ | COMPLETE |
| **Financial Analysis LLM** | ✅ | ✅ | ❌ NO AGENT | ⚠️ NO SCHEMA | **NOT INTEGRATED** |

---

## 8. ISSUES & GAPS

### 🔴 Critical

1. **BusinessModelResult Schema Mismatch**
   - Agent tries to set `claims` field that doesn't exist in schema
   - Will fail at runtime when calling `BusinessModelResult(claims=...)`
   - **Fix:** Add `claims: list[Claim] = Field(default_factory=list)` to `BusinessModelResult`

### 🟡 Medium Priority

2. **Financial Analysis Not Integrated**
   - Function exists: `analyze_financial_with_llm()`
   - No agent calls it
   - No financial analysis output in Phase 3 workflow
   - No schema in `phase3.py` to store results
   - **Options:**
     - Create a Financial Agent to call the LLM function
     - Or integrate financial analysis into Business Model Agent
     - Add `financial: FinancialAnalysisOutput | None` to `BusinessModelResult`

3. **Missing LLM Provider Integration**
   - Decision Agent has optional LLM proposal field but not implemented
   - Could enhance decisions with LLM reasoning (non-binding)

### 🟢 Minor

4. **Validation Plan Fallback**
   - Currently catches all exceptions and silently falls back
   - LLM enrichment failures logged as warning but not exposed to caller

---

## 9. SUMMARY TABLE: What's Complete vs. Needs Work

### ✅ COMPLETE & WORKING
- Business Model analysis (LLM-based)
- Market/Industry analysis (LLM-based)
- Competition analysis (LLM-based)
- Customer analysis (LLM-based)
- Feasibility assessment (hybrid)
- Risk identification (hybrid)
- Red Team objections (LLM-based)
- Research investigation (provider-based)
- Synthesis (deterministic, evidence-based)
- Decision gate (deterministic rules)
- Validation plan generation (hybrid with LLM enrichment)

### ⚠️ NEEDS ATTENTION
- **BusinessModelResult missing `claims` field** (schema bug)
- **Financial analysis LLM function exists but not integrated** (no agent, no schema in Phase 3)

### ❌ NOT IMPLEMENTED
- Dedicated Financial Agent (the LLM function exists but unused)
- LLM-enhanced decision making (optional field exists but not used)

---

## 10. CODE FLOW: How It Works

```
GraphState (structured_idea, raw_idea, classification)
    ↓
[PARALLEL PHASE 2]
  ├→ research_agent() → research_result + claims
  ├→ competition_agent() → competition_result + claims
  └→ customer_agent() → customer_result + claims
    ↓
[PARALLEL PHASE 3 - DATA GATHERING]
  ├→ market_agent() → market_result (uses research claims)
  ├→ business_model_agent() → business_model_result
  ├→ feasibility_agent() → feasibility_result
  ├→ risk_agent() → risk_result
  └→ red_team_agent() → red_team_result (uses all upstream results)
    ↓
[SERIAL PHASE 3 - SYNTHESIS & DECISION]
  ├→ synthesis_agent() → synthesis_result (template-based aggregation)
  ├→ decision_gate_node() → decision_result (deterministic rules)
  └→ validation_plan_node() → validation_plan (if VALIDATE_MORE)
    ↓
[OUTPUT]
  FounderDecisionBrief (all results + decision + validation plan)
```

---


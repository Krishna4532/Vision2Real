from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, ConfigDict

# ---------------------------------------------------------------------------
# Shared enums (as Literal types, consistent with the rest of the codebase's
# style in schemas/evidence.py and schemas/analysis.py, which use Literal
# rather than PyEnum for wire-friendly JSON schemas).
# ---------------------------------------------------------------------------

EvidenceBasis = Literal["VERIFIED", "INFERRED", "ASSUMED", "UNKNOWN"]
"""Distinguishes how a conclusion is grounded:

- VERIFIED: directly supported by 'supported' status claims/evidence.
- INFERRED: derived from 'inference' status claims via a documented logical step.
- ASSUMED: a necessary assumption where no evidence exists yet (still labeled,
  never silently treated as fact).
- UNKNOWN: required information is simply missing; do not fabricate a value.
"""

FeasibilityLevel = Literal["LOW", "MEDIUM", "HIGH", "UNKNOWN"]

RiskCategory = Literal[
    "MARKET",
    "CUSTOMER",
    "COMPETITION",
    "PRODUCT",
    "TECHNICAL",
    "FINANCIAL",
    "REGULATORY",
    "OPERATIONAL",
]

RiskSeverity = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
RiskLikelihood = Literal["LOW", "MEDIUM", "HIGH", "UNKNOWN"]

RiskClassification = Literal["FACT", "INFERENCE", "HYPOTHESIS"]
"""A risk is only ever "FACT" (evidence-backed, i.e. it carries evidence_ids)
INFERENCE (reasoned from partial/indirect evidence) or HYPOTHESIS (no
evidence at all). Never presented as fact without evidence_ids."""

Decision = Literal["BUILD", "VALIDATE_MORE", "PIVOT", "REJECT"]


# ---------------------------------------------------------------------------
# 1. Synthesis
# ---------------------------------------------------------------------------


class KeyInsight(BaseModel):
    category: Literal[
        "strongest_evidence",
        "weakest_evidence",
        "important_unknown",
        "market_signal",
        "customer_signal",
        "competitive_signal",
    ]
    statement: str
    evidence_ids: list[str] = Field(default_factory=list)
    claim_ids: list[str] = Field(default_factory=list)
    basis: EvidenceBasis = "UNKNOWN"


class EvidenceConfidenceSummary(BaseModel):
    """Aggregate counts of claims by status, used as the quantitative backbone
    for founder-friendly confidence indicators/charts."""

    supported: int = 0
    inference: int = 0
    hypothesis: int = 0
    unsupported: int = 0
    unknown: int = 0
    total_claims: int = 0
    total_evidence_items: int = 0
    total_sources: int = 0
    overall_confidence_score: float = 0.0  # 0..1, deterministic weighted score


class SynthesisResult(BaseModel):
    status: Literal["success", "partial", "failed"] = "failed"
    executive_summary: str = ""
    what_it_is: str = ""
    who_it_serves: str = ""
    problem_solved: str = ""
    value_creation: str = ""
    current_evidence_strength: EvidenceBasis = "UNKNOWN"
    key_insights: list[KeyInsight] = Field(default_factory=list)
    evidence_confidence: EvidenceConfidenceSummary = Field(default_factory=EvidenceConfidenceSummary)
    inputs_used: list[str] = Field(
        default_factory=list, description="Which upstream components fed synthesis, e.g. ['research', 'customer']"
    )
    inputs_missing: list[str] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# 2. Business Model / Economics
# ---------------------------------------------------------------------------


class ValuedField(BaseModel):
    """A single economics data point with explicit provenance so the frontend
    can render 'VERIFIED/INFERRED/ASSUMED/UNKNOWN' badges per figure."""

    label: str
    value: str | float | None = None
    basis: EvidenceBasis = "UNKNOWN"
    evidence_ids: list[str] = Field(default_factory=list)
    notes: str | None = None


class BusinessModelResult(BaseModel):
    status: Literal["success", "partial", "failed"] = "failed"
    revenue_model: ValuedField = Field(default_factory=lambda: ValuedField(label="revenue_model"))
    pricing_assumptions: list[ValuedField] = Field(default_factory=list)
    cost_drivers: list[ValuedField] = Field(default_factory=list)
    unit_economics: list[ValuedField] = Field(default_factory=list)
    monetization_options: list[ValuedField] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    claims: list[Any] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# 3. Product & Feasibility
# ---------------------------------------------------------------------------


class ProductSummary(BaseModel):
    core_product: str | None = None
    mvp_scope: list[str] = Field(default_factory=list)
    essential_features: list[str] = Field(default_factory=list)
    non_essential_features: list[str] = Field(default_factory=list)
    user_journey: list[str] = Field(default_factory=list)
    differentiation: str | None = None
    basis: EvidenceBasis = "UNKNOWN"


class FeasibilityCategoryAssessment(BaseModel):
    category: Literal[
        "technical_complexity",
        "dependencies",
        "integrations",
        "data_requirements",
        "ai_ml_requirements",
        "infrastructure_requirements",
        "regulatory_operational_dependencies",
    ]
    level: FeasibilityLevel = "UNKNOWN"
    notes: str | None = None
    evidence_ids: list[str] = Field(default_factory=list)


class FeasibilityResult(BaseModel):
    status: Literal["success", "partial", "failed"] = "failed"
    product: ProductSummary = Field(default_factory=ProductSummary)
    claims: list[Any] = Field(default_factory=list)
    technical_feasibility: FeasibilityLevel = "UNKNOWN"
    category_assessments: list[FeasibilityCategoryAssessment] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# 3b. Financial Analysis
# ---------------------------------------------------------------------------

class FinancialResult(BaseModel):
    """Financial analysis output with explicit provenance for all estimates."""
    status: Literal["success", "partial", "failed"] = "failed"
    startup_costs: ValuedField = Field(default_factory=lambda: ValuedField(label="startup_costs"))
    year1_revenue: ValuedField = Field(default_factory=lambda: ValuedField(label="year1_revenue"))
    year3_revenue: ValuedField = Field(default_factory=lambda: ValuedField(label="year3_revenue"))
    gross_margin: ValuedField = Field(default_factory=lambda: ValuedField(label="gross_margin"))
    burn_rate: ValuedField = Field(default_factory=lambda: ValuedField(label="burn_rate"))
    runway_months: ValuedField = Field(default_factory=lambda: ValuedField(label="runway_months"))
    funding_requirement: ValuedField = Field(default_factory=lambda: ValuedField(label="funding_requirement"))
    break_even_timeline: ValuedField = Field(default_factory=lambda: ValuedField(label="break_even_timeline"))
    key_assumptions: list[str] = Field(default_factory=list)
    cost_drivers: list[str] = Field(default_factory=list)
    revenue_drivers: list[str] = Field(default_factory=list)
    financial_risks: list[str] = Field(default_factory=list)
    claims: list[Any] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# 4. Risk
# ---------------------------------------------------------------------------


class RiskItem(BaseModel):
    id: str | None = None
    risk_statement: str
    category: RiskCategory
    severity: RiskSeverity
    likelihood: RiskLikelihood
    impact: str
    classification: RiskClassification
    evidence_ids: list[str] = Field(default_factory=list)
    claim_ids: list[str] = Field(default_factory=list)
    mitigation: str
    falsification_criteria: str


class RiskResult(BaseModel):
    status: Literal["success", "partial", "failed"] = "failed"
    risks: list[RiskItem] = Field(default_factory=list)
    claims: list[Any] = Field(default_factory=list)
    critical_unresolved_risk_ids: list[str] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# 4b. Market / Industry
# ---------------------------------------------------------------------------

MarketMaturity = Literal["NASCENT", "GROWING", "MATURE", "DECLINING", "UNKNOWN"]


class MarketSignal(BaseModel):
    """A single market/industry data point with explicit provenance, mirroring
    ValuedField's shape - deliberately NOT reusing ValuedField directly so
    Market signals can carry their own category taxonomy without overloading
    the Business Model vocabulary."""

    category: Literal[
        "market_existence",
        "market_category",
        "industry_dynamics",
        "demand_signal",
        "growth_signal",
        "trend",
        "geography",
        "market_constraint",
        "regulatory_context",
        "market_maturity",
        "segment",
    ]
    statement: str
    basis: EvidenceBasis = "UNKNOWN"
    evidence_ids: list[str] = Field(default_factory=list)
    claim_ids: list[str] = Field(default_factory=list)


class MarketResult(BaseModel):
    status: Literal["success", "partial", "failed"] = "failed"
    claims: list[Any] = Field(default_factory=list)
    market_exists: EvidenceBasis = "UNKNOWN"
    """Whether evidence supports that a distinct market for this idea exists
    at all - VERIFIED/INFERRED/ASSUMED/UNKNOWN, never a bare boolean, so the
    frontend can render confidence rather than false certainty."""
    market_category: str | None = None
    market_maturity: MarketMaturity = "UNKNOWN"
    geography: str | None = None
    signals: list[MarketSignal] = Field(default_factory=list)
    segments: list[str] = Field(default_factory=list)
    # Explicitly NOT included: tam / sam / som / market_size / growth_rate /
    # revenue figures. Per spec, these must never be fabricated. If a future
    # data source provides them, add fields with mandatory evidence_ids and
    # EvidenceBasis - never a bare number.
    errors: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# 4c. Red Team
# ---------------------------------------------------------------------------

RedTeamCategory = Literal[
    "CUSTOMER_ADOPTION",
    "MARKET",
    "COMPETITION",
    "PRODUCT",
    "TECHNICAL",
    "BUSINESS_MODEL",
    "OPERATIONAL",
    "REGULATORY",
    "EXECUTION",
]

RedTeamSeverity = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]


class RedTeamFinding(BaseModel):
    """A single objection the Red Team raises against the idea. Structurally
    similar to RiskItem (both need evidence_ids/classification/severity/
    falsification_criteria) but kept as a distinct model: a Risk describes an
    unresolved *uncertainty*, a RedTeamFinding is an *actively adversarial
    objection* explicitly aimed at disproving a stated assumption - the two
    are produced by different reasoning processes (Risk aggregates negative-
    status claims; Red Team interrogates the idea's own assumptions/claims-
    of-success) and a future frontend may want to render them differently
    (a risk matrix vs. an objections list)."""

    id: str | None = None
    assumption_challenged: str
    objection: str
    category: RedTeamCategory
    severity: RedTeamSeverity
    classification: RiskClassification  # FACT / INFERENCE / HYPOTHESIS
    evidence_ids: list[str] = Field(default_factory=list)
    claim_ids: list[str] = Field(default_factory=list)
    falsification_criteria: str
    is_potentially_fatal: bool = False
    """True if this objection, if confirmed, would alone be sufficient to
    invalidate the idea (e.g. 'no evidence any customer would pay')."""


class RedTeamResult(BaseModel):
    status: Literal["success", "partial", "failed"] = "failed"
    findings: list[RedTeamFinding] = Field(default_factory=list)
    claims: list[Any] = Field(default_factory=list)
    strongest_objection_id: str | None = None
    weakest_assumption_id: str | None = None
    potentially_fatal_finding_ids: list[str] = Field(default_factory=list)
    missing_decision_critical_evidence: list[str] = Field(default_factory=list)
    critical_finding_ids: list[str] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# 5. Founder Decision
# ---------------------------------------------------------------------------


class DecisionRuleTrace(BaseModel):
    """Records which deterministic rule fired, for auditability - the founder
    (or a developer) can see exactly why the gate produced this decision."""

    rule_id: str
    description: str
    triggered: bool
    detail: str | None = None


class DecisionResult(BaseModel):
    decision: Decision
    llm_proposed_decision: Decision | None = None
    """The (non-binding) decision an LLM layer proposed, if any. Deterministic
    code always has final say - see decision_rules.py."""
    rationale: list[str] = Field(default_factory=list)
    rule_trace: list[DecisionRuleTrace] = Field(default_factory=list)
    confidence: float = 0.0
    is_conservative_override: bool = False
    """True when the decision was downgraded (e.g. BUILD -> VALIDATE_MORE)
    because of degraded/missing analysis, per the Phase 3 degraded-state
    requirement."""


# ---------------------------------------------------------------------------
# 6. Validation Plan
# ---------------------------------------------------------------------------


class ValidationItem(BaseModel):
    id: str | None = None
    question: str
    why_it_matters: str
    evidence_missing: list[str] = Field(default_factory=list)
    proposed_method: str
    expected_signal: str
    success_interpretation: str
    failure_interpretation: str
    priority: Literal["HIGH", "MEDIUM", "LOW"] = "MEDIUM"


class ValidationPlan(BaseModel):
    generated: bool = False
    items: list[ValidationItem] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# 7. Founder Decision Brief (top-level Phase 3 aggregate)
# ---------------------------------------------------------------------------


class FounderDecisionBrief(BaseModel):
    analysis_id: str | None = None
    synthesis: SynthesisResult | None = None
    business_model: BusinessModelResult | None = None
    feasibility: FeasibilityResult | None = None
    market: MarketResult | None = None
    risk: RiskResult | None = None
    red_team: RedTeamResult | None = None
    decision: DecisionResult | None = None
    validation_plan: ValidationPlan | None = None
    generated_at: str | None = None
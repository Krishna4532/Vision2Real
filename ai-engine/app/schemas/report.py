"""
Phase 6 - Report Intelligence schemas.

This module is a COMPOSITION layer over existing schemas, not a duplicate
representation. FounderReport embeds the actual existing Pydantic models
(ResearchResult, CompetitionResult, CustomerResult, and the Phase 3
FounderDecisionBrief aggregate) directly rather than re-declaring their
fields - per the explicit "reuse existing schemas, don't duplicate" Phase 6
requirement.

FounderDecisionBrief (app/schemas/phase3.py) was already defined as exactly
this aggregate (synthesis/business_model/feasibility/market/risk/red_team/
decision/validation_plan) but was never actually constructed anywhere in the
codebase before Phase 6 - report_service.py is what finally populates it.
"""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

from app.schemas.evidence import ResearchResult, CompetitionResult, CustomerResult
from app.schemas.phase3 import FounderDecisionBrief, KeyInsight, EvidenceConfidenceSummary

VisualizationType = Literal[
    "metric",
    "bar_chart",
    "line_chart",
    "pie_chart",
    "comparison",
    "distribution",
    "evidence_relationship",
]


class Visualization(BaseModel):
    """Backend data only - the frontend decides how to render this.

    HARD RULE: `data` must only ever contain numbers/values that are directly
    counted or read from persisted evidence (e.g. counting existing claims by
    status, counting existing risks by severity). It must NEVER contain an
    invented/estimated quantitative value (TAM/SAM/SOM, market size, growth
    rate, revenue, pricing, adoption %, etc.) that isn't itself sourced from a
    'supported'-status claim. When the underlying evidence to support a
    visualization doesn't exist, `available` must be False and `data` must be
    None - never a fabricated placeholder number.
    """

    visualization_id: str
    type: VisualizationType
    title: str
    description: str
    data: dict[str, Any] | list[dict[str, Any]] | None = None
    source_ids: list[str] = Field(default_factory=list)
    claim_ids: list[str] = Field(default_factory=list)
    evidence_ids: list[str] = Field(default_factory=list)
    interpretation: str | None = None
    available: bool = True
    reason_unavailable: str | None = None


class EvidenceSummarySection(BaseModel):
    """Founder-facing evidence overview. Reuses KeyInsight/
    EvidenceConfidenceSummary directly from Synthesis (Phase 3) rather than
    recomputing strongest/weakest evidence independently - Synthesis already
    does this work; Phase 6 must not redo analysis, only present it.
    """

    confidence: EvidenceConfidenceSummary = Field(default_factory=EvidenceConfidenceSummary)
    strongest_evidence: list[KeyInsight] = Field(default_factory=list)
    weakest_evidence: list[KeyInsight] = Field(default_factory=list)
    important_unknowns: list[KeyInsight] = Field(default_factory=list)
    evidence_gaps: list[str] = Field(
        default_factory=list,
        description="Upstream components that are missing/failed/degraded, named plainly (e.g. 'research', 'market').",
    )


class IdeaSection(BaseModel):
    problem: str | None = None
    solution: str | None = None
    target_customer: str | None = None
    industry_category: str | None = None
    geography: str | None = None
    business_model: str | None = None
    assumptions: list[str] = Field(default_factory=list)
    unknowns: list[str] = Field(default_factory=list)
    clarifying_questions: list[str] = Field(default_factory=list)


class FounderReport(BaseModel):
    """The Phase 6 report contract. Purely a deterministic transformation of
    already-persisted/reconstructed analysis data - see report_service.py.
    Never independently re-derives facts an LLM/agent hasn't already
    produced, and never invents a number for `visualizations` that isn't
    grounded in existing claims/evidence.
    """

    analysis_id: str
    generated_at: str
    status: str
    degraded: bool
    """True when `status` reflects a degraded/rejected/incomplete analysis -
    the report is still generated (per the Phase 6 degraded-state
    requirement), but the frontend can use this to show a banner."""

    executive_summary: str
    startup_snapshot: str = ""
    biggest_opportunities: list[str] = Field(default_factory=list)
    biggest_risks: list[str] = Field(default_factory=list)
    critical_assumptions: list[str] = Field(default_factory=list)
    evidence_strength: str = ""
    contradictions: list[str] = Field(default_factory=list)
    unknowns_that_matter: list[str] = Field(default_factory=list)
    market_reality: str = ""
    customer_reality: str = ""
    competitive_reality: str = ""
    business_model_reality: str = ""
    financial_reality: str = ""
    technical_reality: str = ""
    what_must_be_true: list[str] = Field(default_factory=list)
    validation_roadmap_30d: list[str] = Field(default_factory=list)
    validation_roadmap_90d: list[str] = Field(default_factory=list)
    decision: str = ""
    confidence_explanation: str = ""
    appendix: list[str] = Field(default_factory=list)

    idea: IdeaSection | None = None
    evidence_summary: EvidenceSummarySection = Field(default_factory=EvidenceSummarySection)

    research: ResearchResult | None = None
    competition: CompetitionResult | None = None
    customer: CustomerResult | None = None

    phase3: FounderDecisionBrief = Field(default_factory=FounderDecisionBrief)
    """Business Model / Feasibility / Market / Risk / Red Team / Decision /
    Validation Plan - the existing Phase 3 aggregate model, finally
    populated. `phase3.decision.decision` is the FINAL deterministic verdict;
    `phase3.decision.llm_proposed_decision` is shown alongside it, never in
    place of it (see report_service.py generate_founder_report)."""

    visualizations: list[Visualization] = Field(default_factory=list)

    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
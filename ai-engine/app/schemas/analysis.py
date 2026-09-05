from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.evidence import ResearchResult, CompetitionResult, CustomerResult
from app.schemas.phase3 import (
    SynthesisResult,
    BusinessModelResult,
    FeasibilityResult,
    MarketResult,
    RiskResult,
    RedTeamResult,
    DecisionResult,
    ValidationPlan,
)


class AnalysisRequest(BaseModel):
    idea: str = Field(..., min_length=1, description="Founder-provided raw startup idea")

    @field_validator("idea")
    @classmethod
    def validate_idea(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("idea cannot be empty")
        return cleaned


class PreflightResult(BaseModel):
    is_valid: bool = False
    status: Literal["valid", "rejected", "requires_clarification"] = "valid"
    flags: list[str] = Field(default_factory=list)
    concerns: list[str] = Field(default_factory=list)
    unknowns: list[str] = Field(default_factory=list)
    clarifying_questions: list[str] = Field(default_factory=list)


class StructuredIdea(BaseModel):
    model_config = ConfigDict(extra="allow")

    problem: str | None = None
    solution: str | None = None
    target_customer: str | None = None
    industry_category: str | None = None
    geography: str | None = None
    business_model: str | None = None
    assumptions: list[str] = Field(default_factory=list)
    unknowns: list[str] = Field(default_factory=list)
    clarifying_questions: list[str] = Field(default_factory=list)


class ClassificationResult(BaseModel):
    labels: list[str] = Field(default_factory=list)
    confidence: float | None = None


class AgentResult(BaseModel):
    name: str
    status: Literal["success", "failed", "degraded", "rejected"]
    details: dict[str, Any] = Field(default_factory=dict)


class AnalysisState(BaseModel):
    model_config = ConfigDict(extra="allow")

    current_stage: str = "pre_flight"
    status: Literal["pending", "in_progress", "completed", "rejected", "degraded", "requires_clarification"] = "pending"
    structured_idea: StructuredIdea | None = None
    classification: ClassificationResult | None = None
    preflight: PreflightResult | None = None
    
    # Phase 2 states
    research_status: str = "pending"
    research_result: ResearchResult | None = None
    research_errors: list[str] = Field(default_factory=list)
    
    competition_status: str = "pending"
    competition_result: CompetitionResult | None = None
    competition_errors: list[str] = Field(default_factory=list)
    
    customer_status: str = "pending"
    customer_result: CustomerResult | None = None
    customer_errors: list[str] = Field(default_factory=list)

    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class AnalysisJob(BaseModel):
    id: str
    raw_idea: str
    status: Literal["pending", "in_progress", "completed", "rejected", "degraded", "requires_clarification"]
    current_stage: str = "pre_flight"
    created_at: str | None = None
    updated_at: str | None = None
    structured_result: StructuredIdea | None = None
    classification: ClassificationResult | None = None
    preflight: PreflightResult | None = None
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class AnalysisStatus(BaseModel):
    analysis_id: str
    status: str
    current_stage: str
    details: dict[str, Any] = Field(default_factory=dict)


class AnalysisResult(BaseModel):
    analysis_id: str
    status: str
    current_stage: str
    structured_idea: StructuredIdea | None = None
    classification: ClassificationResult | None = None
    preflight: PreflightResult | None = None
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    
    # Phase 2 results
    research_status: str = "pending"
    research_errors: list[str] = Field(default_factory=list)
    research_result: ResearchResult | None = None
    
    competition_status: str = "pending"
    competition_errors: list[str] = Field(default_factory=list)
    competition_result: CompetitionResult | None = None
    
    customer_status: str = "pending"
    customer_errors: list[str] = Field(default_factory=list)
    customer_result: CustomerResult | None = None

    # Phase 3 results (all optional/None-safe so the existing API contract
    # for Phase 1/2 consumers is unaffected - they simply won't reference
    # these new fields).
    synthesis_status: str = "pending"
    synthesis_errors: list[str] = Field(default_factory=list)
    synthesis_result: SynthesisResult | None = None

    business_model_status: str = "pending"
    business_model_errors: list[str] = Field(default_factory=list)
    business_model_result: BusinessModelResult | None = None

    feasibility_status: str = "pending"
    feasibility_errors: list[str] = Field(default_factory=list)
    feasibility_result: FeasibilityResult | None = None

    risk_status: str = "pending"
    risk_errors: list[str] = Field(default_factory=list)
    risk_result: RiskResult | None = None

    market_status: str = "pending"
    market_errors: list[str] = Field(default_factory=list)
    market_result: MarketResult | None = None

    red_team_status: str = "pending"
    red_team_errors: list[str] = Field(default_factory=list)
    red_team_result: RedTeamResult | None = None

    decision_result: DecisionResult | None = None
    validation_plan: ValidationPlan | None = None

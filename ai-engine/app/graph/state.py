from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.analysis import ClassificationResult, PreflightResult, StructuredIdea
from app.schemas.evidence import ResearchResult, CompetitionResult, CustomerResult
from app.schemas.phase3 import (
    SynthesisResult,
    BusinessModelResult,
    FeasibilityResult,
    FinancialResult,
    MarketResult,
    RiskResult,
    RedTeamResult,
    DecisionResult,
    ValidationPlan,
)


class GraphState(BaseModel):
    model_config = ConfigDict(extra="allow")

    raw_idea: str = ""
    preflight: PreflightResult | None = None
    structured_idea: StructuredIdea | None = None
    classification: ClassificationResult | None = None
    
    # Phase 2: Research, Competition, Customer
    research_result: ResearchResult | None = None
    research_status: str = "pending"
    research_errors: list[str] = Field(default_factory=list)
    
    competition_result: CompetitionResult | None = None
    competition_status: str = "pending"
    competition_errors: list[str] = Field(default_factory=list)
    
    customer_result: CustomerResult | None = None
    customer_status: str = "pending"
    customer_errors: list[str] = Field(default_factory=list)
    
    # Phase 3: Synthesis, Business Model, Feasibility, Risk, Decision, Validation
    synthesis_result: SynthesisResult | None = None
    synthesis_status: str = "pending"
    synthesis_errors: list[str] = Field(default_factory=list)

    business_model_result: BusinessModelResult | None = None
    business_model_status: str = "pending"
    business_model_errors: list[str] = Field(default_factory=list)

    feasibility_result: FeasibilityResult | None = None
    feasibility_status: str = "pending"
    feasibility_errors: list[str] = Field(default_factory=list)

    financial_result: FinancialResult | None = None
    financial_status: str = "pending"
    financial_errors: list[str] = Field(default_factory=list)

    risk_result: RiskResult | None = None
    risk_status: str = "pending"
    risk_errors: list[str] = Field(default_factory=list)

    market_result: MarketResult | None = None
    market_status: str = "pending"
    market_errors: list[str] = Field(default_factory=list)

    red_team_result: RedTeamResult | None = None
    red_team_status: str = "pending"
    red_team_errors: list[str] = Field(default_factory=list)

    decision_result: DecisionResult | None = None
    validation_plan: ValidationPlan | None = None
    phase3_status: str = "pending"

    current_stage: str = "start"
    status: str = "pending"
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


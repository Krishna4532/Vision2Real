from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.analysis import ClassificationResult, PreflightResult, StructuredIdea
from app.schemas.evidence import ResearchResult, CompetitionResult, CustomerResult


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
    
    current_stage: str = "start"
    status: str = "pending"
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)

from enum import Enum
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


class ValidationStatus(str, Enum):
    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class ValidationEventType(str, Enum):
    VALIDATION_SUBMITTED = "VALIDATION_SUBMITTED"
    VALIDATION_STARTED = "VALIDATION_STARTED"
    VALIDATION_COMPLETED = "VALIDATION_COMPLETED"
    VALIDATION_FAILED = "VALIDATION_FAILED"


# ── Progress Event Schema (Part 3) ─────────────────────────────────────────────

class ValidationProgress(BaseModel):
    validation_id: str
    stage: str
    agent_name: str
    status: str  # "waiting", "running", "completed", "failed"
    progress_percentage: float
    message: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    duration_ms: Optional[int] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ── Request ────────────────────────────────────────────────────────────────────

class ValidationCreateRequest(BaseModel):
    idea_description: str = Field(..., min_length=10)
    target_customer: Optional[str] = None
    target_market: Optional[str] = None
    founder_stage: Optional[str] = None
    source: str = Field(..., description="E.g. marketing, workspace")
    guest_session_id: Optional[str] = None


# ── Sub-responses ─────────────────────────────────────────────────────────────

class ValidationAttachmentResponse(BaseModel):
    id: str
    filename: str
    original_filename: str
    mime_type: str
    file_size: int
    uploaded_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ValidationInputResponse(BaseModel):
    idea_description: str
    target_customer: Optional[str] = None
    target_market: Optional[str] = None
    founder_stage: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


# ── Report Schema (Part 8) ────────────────────────────────────────────────────

class SWOTAnalysis(BaseModel):
    strengths: List[str] = []
    weaknesses: List[str] = []
    opportunities: List[str] = []
    threats: List[str] = []


class DetailedScores(BaseModel):
    overall_score: float = 0.0
    confidence_score: float = 0.0
    market_score: float = 0.0
    business_model_score: float = 0.0
    feasibility_score: float = 0.0
    risk_score: float = 0.0


class StructuredValidationReport(BaseModel):
    title: str = "Vision2Real AI Startup Validation Report"
    executive_summary: str
    problem_analysis: str
    solution_analysis: str
    target_customer: str
    market_opportunity: str
    competitive_landscape: str
    business_model: str
    revenue_model: str
    financial_outlook: str
    risk_assessment: str
    swot: SWOTAnalysis
    scores: DetailedScores
    overall_score: float
    confidence_score: float
    recommendation: str  # PROCEED, PIVOT, PAUSE
    next_steps: List[str] = []
    agent_outputs: Dict[str, Any] = {}
    pdf_url: Optional[str] = None
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ── Metadata ──────────────────────────────────────────────────────────────────

class ValidationMetadata(BaseModel):
    version: str = "1.0.0"
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ── Full response ─────────────────────────────────────────────────────────────

class ValidationResponse(BaseModel):
    id: str
    founder_id: Optional[str] = None
    idea_id: Optional[str] = None
    guest_session_id: Optional[str] = None
    source: str
    status: str
    overall_score: Optional[float] = None
    recommendation: Optional[str] = None
    llm_provider: Optional[str] = None
    llm_model: Optional[str] = None
    prompt_version: Optional[str] = None
    report_schema_version: Optional[str] = None
    processing_time_ms: Optional[int] = None
    provider_latency_ms: Optional[int] = None
    total_tokens: Optional[int] = None
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    estimated_cost: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    inputs: Optional[ValidationInputResponse] = None
    attachments: List[ValidationAttachmentResponse] = []
    report_data: Optional[Dict[str, Any]] = None

    metadata: ValidationMetadata = Field(default_factory=ValidationMetadata)
    model_config = ConfigDict(from_attributes=True)


class ValidationListItem(BaseModel):
    id: str
    source: str
    status: str
    overall_score: Optional[float] = None
    recommendation: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    idea_description: Optional[str] = None
    target_customer: Optional[str] = None
    target_market: Optional[str] = None
    founder_stage: Optional[str] = None
    report_available: bool = False
    pdf_available: bool = False


class ValidationListResponse(BaseModel):
    items: List[ValidationListItem]
    page: int
    page_size: int
    total: int
    total_pages: int


class ValidationStatusResponse(BaseModel):
    id: str
    status: str
    metadata: ValidationMetadata = Field(default_factory=ValidationMetadata)
    model_config = ConfigDict(from_attributes=True)


# ── Health ────────────────────────────────────────────────────────────────────

class ValidationHealthResponse(BaseModel):
    provider_status: str
    database_status: str
    storage_status: str

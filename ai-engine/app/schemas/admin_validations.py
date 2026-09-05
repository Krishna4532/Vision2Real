from __future__ import annotations

from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict


# ── Founder identity embedded in validation responses ────────────────────────

class ValidationFounderInfo(BaseModel):
    id: str
    full_name: str
    email: str

    model_config = ConfigDict(from_attributes=True)


# ── Founder submission inputs ─────────────────────────────────────────────────

class ValidationInputData(BaseModel):
    idea_description: str
    target_customer: str | None = None
    target_market: str | None = None
    founder_stage: str | None = None

    model_config = ConfigDict(from_attributes=True)


# ── Validation lifecycle events ───────────────────────────────────────────────

class ValidationEventItem(BaseModel):
    id: str
    event_type: str
    metadata_json: dict[str, Any] | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Operational metadata ──────────────────────────────────────────────────────

class ValidationOperationalMeta(BaseModel):
    """Fields that exist in the database — only present if not None."""
    llm_provider: str | None = None
    llm_model: str | None = None
    prompt_version: str | None = None
    report_schema_version: str | None = None
    processing_time_ms: int | None = None
    provider_latency_ms: int | None = None
    total_tokens: int | None = None
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    estimated_cost: float | None = None
    review_status: str | None = None


# ── List item (directory view) ────────────────────────────────────────────────

class AdminValidationListItem(BaseModel):
    id: str
    status: str
    source: str
    overall_score: float | None = None
    recommendation: str | None = None
    llm_model: str | None = None
    llm_provider: str | None = None
    processing_time_ms: int | None = None
    created_at: datetime
    founder: ValidationFounderInfo | None = None
    # Idea title derived from ValidationInput idea_description (truncated)
    idea_snippet: str | None = None

    model_config = ConfigDict(from_attributes=True)


class PaginatedValidationsResponse(BaseModel):
    items: list[AdminValidationListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


# ── Detail view ───────────────────────────────────────────────────────────────

class AdminValidationDetailResponse(BaseModel):
    id: str
    status: str
    source: str
    overall_score: float | None = None
    recommendation: str | None = None
    created_at: datetime
    updated_at: datetime

    # Who submitted
    founder: ValidationFounderInfo | None = None

    # Original founder submission
    inputs: ValidationInputData | None = None

    # AI result — the complete persisted report JSON
    report_json: dict[str, Any] | None = None

    # Operational metadata
    operational: ValidationOperationalMeta

    # Lifecycle events
    events: list[ValidationEventItem] = []

    model_config = ConfigDict(from_attributes=True)

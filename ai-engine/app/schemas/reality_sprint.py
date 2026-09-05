from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class RealitySprintStatus(str, Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    ACCEPTED = "ACCEPTED"
    SCHEDULED = "SCHEDULED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class RealitySprintAttachmentResponse(BaseModel):
    id: str
    reality_sprint_id: str
    filename: str
    original_filename: str
    mime_type: str
    file_size: int
    storage_path: str
    download_url: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class RealitySprintCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    startup_name: str | None = Field(None, max_length=255)
    description: str = Field(..., min_length=10)
    target_customer: str | None = Field(None, max_length=255)
    target_market: str | None = Field(None, max_length=255)
    founder_stage: str | None = Field(None, max_length=100)
    priority: str = Field("NORMAL", max_length=50)
    request_source: str = Field("FOUNDER_WORKSPACE", max_length=100)
    estimated_duration_days: int | None = Field(None, ge=1)
    execution_mode: str = Field("v1", max_length=50)
    version: int = Field(1, ge=1)
    extra_metadata: dict[str, Any] = Field(default_factory=dict)

    # Future reference placeholders (optional strings/UUIDs)
    project_id: str | None = Field(None, max_length=36)
    workspace_id: str | None = Field(None, max_length=36)
    roadmap_id: str | None = Field(None, max_length=36)

    # Future V2 inputs; intentionally persisted as empty metadata until implemented.
    agent_execution: dict[str, Any] | None = None
    deliverables: list[Any] = Field(default_factory=list)
    timeline: list[Any] = Field(default_factory=list)
    research: dict[str, Any] | None = None
    roadmap: dict[str, Any] | None = None
    prd: dict[str, Any] | None = None
    architecture: dict[str, Any] | None = None
    technical_plan: dict[str, Any] | None = None
    generated_assets: list[Any] = Field(default_factory=list)
    design: dict[str, Any] | None = None


class RealitySprintUpdate(BaseModel):
    title: str | None = Field(None, min_length=3, max_length=255)
    startup_name: str | None = Field(None, max_length=255)
    description: str | None = Field(None, min_length=10)
    target_customer: str | None = Field(None, max_length=255)
    target_market: str | None = Field(None, max_length=255)
    founder_stage: str | None = Field(None, max_length=100)
    status: RealitySprintStatus | None = None
    priority: str | None = Field(None, max_length=50)
    estimated_duration_days: int | None = Field(None, ge=1)
    is_archived: bool | None = None
    extra_metadata: dict[str, Any] | None = None


class RealitySprintResponse(BaseModel):
    id: str
    founder_id: str
    title: str
    startup_name: str | None = None
    description: str
    target_customer: str | None = None
    target_market: str | None = None
    founder_stage: str | None = None
    status: RealitySprintStatus
    priority: str
    request_source: str
    estimated_duration_days: int | None = None
    execution_mode: str
    version: int
    is_archived: bool
    extra_metadata: dict[str, Any] = Field(default_factory=dict)

    # Future reference placeholders
    project_id: str | None = None
    workspace_id: str | None = None
    roadmap_id: str | None = None

    # Future-compatible optional V2 fields
    agent_execution: dict[str, Any] | None = None
    deliverables: list[Any] = Field(default_factory=list)
    timeline: list[Any] = Field(default_factory=list)
    research: dict[str, Any] | None = None
    roadmap: dict[str, Any] | None = None
    prd: dict[str, Any] | None = None
    architecture: dict[str, Any] | None = None
    technical_plan: dict[str, Any] | None = None
    generated_assets: list[Any] = Field(default_factory=list)
    design: dict[str, Any] | None = None

    # Core audit timestamps
    created_at: datetime
    updated_at: datetime

    # Lifecycle timestamps
    submitted_at: datetime | None = None
    review_started_at: datetime | None = None
    accepted_at: datetime | None = None
    scheduled_at: datetime | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    cancelled_at: datetime | None = None

    attachments: list[RealitySprintAttachmentResponse] = Field(default_factory=list)
    model_config = ConfigDict(from_attributes=True)


class RealitySprintListItem(RealitySprintResponse):
    pass


class RealitySprintPagination(BaseModel):
    page: int
    page_size: int
    total: int
    total_pages: int


class RealitySprintListResponse(BaseModel):
    status: str = "success"
    message: str = "Reality Sprint requests retrieved successfully."
    data: list[RealitySprintListItem] = Field(default_factory=list)
    pagination: RealitySprintPagination


class RealitySprintAnalytics(BaseModel):
    status: str = "success"
    message: str = "Reality Sprint analytics retrieved successfully."
    analytics: dict[str, Any] = Field(default_factory=lambda: {
        "total_requests": 0,
        "submitted": 0,
        "under_review": 0,
        "accepted": 0,
        "scheduled": 0,
        "in_progress": 0,
        "completed": 0,
        "cancelled": 0,
        "pending": 0,
        "acceptance_rate": 0.0,
        "completion_rate": 0.0,
        "average_review_time": 0.0,
        "average_completion_time": 0.0,
        "latest_request": "",
        "most_requested_target_market": "",
        "most_requested_founder_stage": "",
    })


class RealitySprintMutationResponse(BaseModel):
    status: str = "success"
    message: str
    data: RealitySprintResponse


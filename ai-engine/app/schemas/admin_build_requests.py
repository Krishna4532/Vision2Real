from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, ConfigDict, Field


class AdminFounderInfo(BaseModel):
    id: str
    full_name: str
    email: str
    phone_number: Optional[str] = None
    founder_stage: Optional[str] = None
    role: str = "FOUNDER"
    model_config = ConfigDict(from_attributes=True)


class AdminBuildRequestListItem(BaseModel):
    id: str
    founder_id: str
    project_title: str
    startup_name: Optional[str] = None
    description_snippet: Optional[str] = None
    product_category: Optional[str] = None
    priority: str
    status: str
    progress_percentage: int = 0
    current_phase: Optional[str] = None
    current_milestone: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    founder: Optional[AdminFounderInfo] = None
    model_config = ConfigDict(from_attributes=True)


class PaginatedBuildRequestsResponse(BaseModel):
    items: list[AdminBuildRequestListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class BuildRequestMilestoneItem(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    order: int = 1
    completed: bool = False
    completed_at: Optional[str] = None


class BuildRequestOperationalNote(BaseModel):
    id: str
    author_id: Optional[str] = None
    author_name: str = "Super Admin"
    content: str
    created_at: datetime


class BuildRequestTimelineEventResponse(BaseModel):
    id: str
    event_type: str
    title: str
    description: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class BuildRequestAttachmentResponse(BaseModel):
    id: str
    filename: str
    original_filename: str
    mime_type: str
    file_size: int
    download_url: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class AdminBuildRequestDetailResponse(BaseModel):
    id: str
    founder_id: str
    title: str
    startup_name: Optional[str] = None
    description: str
    product_category: Optional[str] = None
    target_customer: Optional[str] = None
    target_market: Optional[str] = None
    founder_stage: Optional[str] = None
    priority: str
    status: str
    estimated_duration_days: Optional[int] = None
    current_phase: Optional[str] = None
    current_work: Optional[str] = None
    current_milestone: Optional[str] = None
    progress_percentage: int = 0
    execution_mode: str = "v1"
    version: int = 1
    created_at: datetime
    updated_at: datetime
    submitted_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    expected_completion_at: Optional[datetime] = None
    founder: Optional[AdminFounderInfo] = None
    attachments: list[BuildRequestAttachmentResponse] = Field(default_factory=list)
    timeline_events: list[BuildRequestTimelineEventResponse] = Field(default_factory=list)
    milestones: list[BuildRequestMilestoneItem] = Field(default_factory=list)
    operational_notes: list[BuildRequestOperationalNote] = Field(default_factory=list)
    extra_metadata: dict[str, Any] = Field(default_factory=dict)
    model_config = ConfigDict(from_attributes=True)


class BuildRequestRejectRequest(BaseModel):
    reason: Optional[str] = Field(None, max_length=500)


class BuildRequestProgressRequest(BaseModel):
    progress_percentage: int = Field(..., ge=0, le=100)
    current_phase: Optional[str] = Field(None, max_length=100)
    current_milestone: Optional[str] = Field(None, max_length=255)
    milestones: Optional[list[BuildRequestMilestoneItem]] = None


class BuildRequestNoteRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)

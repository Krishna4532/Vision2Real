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
    role: Optional[str] = "FOUNDER"
    model_config = ConfigDict(from_attributes=True)


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


class AdminRealitySprintListItem(BaseModel):
    id: str
    title: str
    startup_name: Optional[str] = None
    description_snippet: Optional[str] = None
    status: str
    priority: str
    progress: int = 0
    created_at: datetime
    updated_at: datetime
    founder: Optional[AdminFounderInfo] = None
    model_config = ConfigDict(from_attributes=True)


class PaginatedRealitySprintsResponse(BaseModel):
    items: list[AdminRealitySprintListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class RealitySprintActivityItem(BaseModel):
    id: str
    actor_id: Optional[str] = None
    actor_role: str
    event_type: str
    metadata_json: Optional[dict[str, Any]] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class RealitySprintMilestoneItem(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    completed: bool = False
    completed_at: Optional[str] = None


class AdminRealitySprintDetailResponse(BaseModel):
    id: str
    title: str
    startup_name: Optional[str] = None
    description: str
    target_customer: Optional[str] = None
    target_market: Optional[str] = None
    founder_stage: Optional[str] = None
    status: str
    priority: str
    progress: int = 0
    created_at: datetime
    updated_at: datetime
    submitted_at: Optional[datetime] = None
    review_started_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    founder: Optional[AdminFounderInfo] = None
    milestones: list[RealitySprintMilestoneItem] = Field(default_factory=list)
    activities: list[RealitySprintActivityItem] = Field(default_factory=list)
    attachments: list[RealitySprintAttachmentResponse] = Field(default_factory=list)
    extra_metadata: dict[str, Any] = Field(default_factory=dict)
    model_config = ConfigDict(from_attributes=True)


class RealitySprintRejectRequest(BaseModel):
    reason: Optional[str] = Field(None, max_length=500)


class RealitySprintProgressRequest(BaseModel):
    progress: int = Field(..., ge=0, le=100)
    milestones: Optional[list[RealitySprintMilestoneItem]] = None


class RealitySprintListParams(BaseModel):
    page: int = 1
    page_size: int = 20
    search: Optional[str] = None
    status: Optional[str] = None
    founder_id: Optional[str] = None
    sort_by: str = "created_at"
    sort_order: str = "desc"

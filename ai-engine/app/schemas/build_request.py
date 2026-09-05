from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class BuildRequestStatus(str, Enum):
    SUBMITTED = "SUBMITTED"
    ACCEPTED = "ACCEPTED"
    PLANNING = "PLANNING"
    UI_DESIGN = "UI_DESIGN"
    BACKEND = "BACKEND"
    FRONTEND = "FRONTEND"
    TESTING = "TESTING"
    DEPLOYMENT = "DEPLOYMENT"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class Priority(str, Enum):
    HIGH = "HIGH"
    NORMAL = "NORMAL"
    LOW = "LOW"


class SenderType(str, Enum):
    FOUNDER = "FOUNDER"
    ADMIN = "ADMIN"


class BuildRequestTimelineEventType(str, Enum):
    REQUEST_CREATED = "REQUEST_CREATED"
    REQUEST_ACCEPTED = "REQUEST_ACCEPTED"
    PLANNING_STARTED = "PLANNING_STARTED"
    UI_DESIGN_STARTED = "UI_DESIGN_STARTED"
    BACKEND_STARTED = "BACKEND_STARTED"
    FRONTEND_STARTED = "FRONTEND_STARTED"
    TESTING_STARTED = "TESTING_STARTED"
    DEPLOYMENT_STARTED = "DEPLOYMENT_STARTED"
    MESSAGE_POSTED = "MESSAGE_POSTED"
    STATUS_UPDATED = "STATUS_UPDATED"
    PROJECT_COMPLETED = "PROJECT_COMPLETED"
    PROJECT_CANCELLED = "PROJECT_CANCELLED"


class AttachmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    build_request_id: str
    filename: str
    original_filename: str
    mime_type: str
    file_size: int
    storage_path: str
    download_url: str
    created_at: datetime


class TimelineEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    build_request_id: str
    event_type: BuildRequestTimelineEventType
    title: str
    description: Optional[str] = None
    created_at: datetime


class MessageCreate(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    build_request_id: str
    sender_type: SenderType
    sender_id: str
    message: str
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime


class BuildRequestCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    startup_name: Optional[str] = Field(None, max_length=255)
    description: str = Field(..., min_length=10)
    product_category: Optional[str] = Field(None, max_length=100)
    target_customer: Optional[str] = Field(None, max_length=255)
    target_market: Optional[str] = Field(None, max_length=255)
    founder_stage: Optional[str] = Field(None, max_length=100)
    priority: Priority = Priority.NORMAL
    estimated_duration_days: Optional[int] = Field(None, ge=1, le=365)
    current_phase: Optional[str] = Field(None, max_length=100)
    current_work: Optional[str] = Field(None)
    current_milestone: Optional[str] = Field(None, max_length=255)
    execution_mode: str = Field("v1", max_length=50)
    version: int = Field(1, ge=1)
    extra_metadata: dict[str, Any] = Field(default_factory=dict)
    idempotency_key: Optional[str] = Field(None, max_length=255)
    project_slug: Optional[str] = Field(None, max_length=255)
    project_id: Optional[str] = Field(None, max_length=36)
    workspace_id: Optional[str] = Field(None, max_length=36)



class BuildRequestUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=255)
    startup_name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = Field(None, min_length=10)
    product_category: Optional[str] = Field(None, max_length=100)
    target_customer: Optional[str] = Field(None, max_length=255)
    target_market: Optional[str] = Field(None, max_length=255)
    founder_stage: Optional[str] = Field(None, max_length=100)
    priority: Optional[Priority] = None
    status: Optional[BuildRequestStatus] = None
    estimated_duration_days: Optional[int] = Field(None, ge=1, le=365)
    current_phase: Optional[str] = Field(None, max_length=100)
    current_work: Optional[str] = Field(None)
    current_milestone: Optional[str] = Field(None, max_length=255)
    progress_percentage: Optional[int] = Field(None, ge=0, le=100)
    execution_mode: Optional[str] = Field(None, max_length=50)
    version: Optional[int] = Field(None, ge=1)
    is_archived: Optional[bool] = None
    extra_metadata: Optional[dict[str, Any]] = None
    expected_completion_at: Optional[datetime] = None


class BuildRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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
    progress_percentage: int
    execution_mode: str
    version: int
    is_archived: bool
    extra_metadata: dict[str, Any]
    founder_unread_count: int
    admin_unread_count: int
    idempotency_key: Optional[str] = None
    project_slug: Optional[str] = None
    project_id: Optional[str] = None
    workspace_id: Optional[str] = None

    created_at: datetime
    updated_at: datetime
    submitted_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    expected_completion_at: Optional[datetime] = None
    attachments: List[AttachmentResponse] = Field(default_factory=list)
    timeline_events: List[TimelineEventResponse] = Field(default_factory=list)
    messages: List[MessageResponse] = Field(default_factory=list)


class BuildRequestListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    founder_id: str
    title: str
    startup_name: Optional[str] = None
    product_category: Optional[str] = None
    target_market: Optional[str] = None
    priority: str
    status: str
    current_phase: Optional[str] = None
    current_milestone: Optional[str] = None
    progress_percentage: int
    is_archived: bool
    founder_unread_count: int
    created_at: datetime
    updated_at: datetime


class BuildRequestPagination(BaseModel):
    page: int
    page_size: int
    total: int
    total_pages: int


class BuildRequestListResponse(BaseModel):
    data: List[BuildRequestListItem]
    pagination: BuildRequestPagination


class BuildRequestAnalytics(BaseModel):
    total_requests: int
    active_requests: int
    completed_requests: int
    cancelled_requests: int
    average_progress: float
    average_completion_time_days: float
    completion_rate: float
    most_requested_category: str
    most_requested_market: str
    latest_request: str


class BuildRequestMutationResponse(BaseModel):
    message: str
    data: BuildRequestResponse

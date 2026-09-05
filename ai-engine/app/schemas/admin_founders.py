from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, ConfigDict


class FounderListItemResponse(BaseModel):
    id: str
    full_name: str
    email: str
    role: str
    auth_provider: str
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login_at: datetime | None = None

    # Aggregate stats
    validations_count: int = 0
    reality_sprints_count: int = 0
    build_requests_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class PaginatedFoundersResponse(BaseModel):
    items: list[FounderListItemResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class FounderWorkspaceSummary(BaseModel):
    validations_count: int = 0
    reality_sprints_count: int = 0
    build_requests_count: int = 0
    projects_count: int = 0


class FounderSubmissionItem(BaseModel):
    id: str
    type: str  # REALITY_SPRINT | BUILD_REQUEST | VALIDATION
    title: str
    status: str
    priority: str | None = None
    created_at: datetime


class FounderActivityItem(BaseModel):
    id: str
    title: str
    description: str | None = None
    event_type: str
    created_at: datetime


class FounderDetailResponse(BaseModel):
    id: str
    full_name: str
    email: str
    role: str
    auth_provider: str
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login_at: datetime | None = None

    summary: FounderWorkspaceSummary
    submissions: list[FounderSubmissionItem] = []
    activities: list[FounderActivityItem] = []

    model_config = ConfigDict(from_attributes=True)

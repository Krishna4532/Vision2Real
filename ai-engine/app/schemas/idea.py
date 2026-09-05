from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Literal
from pydantic import BaseModel, Field


class IdeaLifecycleStage(str, Enum):
    DRAFT = "DRAFT"
    READY_FOR_VALIDATION = "READY_FOR_VALIDATION"
    VALIDATING = "VALIDATING"
    VALIDATED = "VALIDATED"
    REALITY_SPRINT = "REALITY_SPRINT"
    BUILD_REQUESTED = "BUILD_REQUESTED"
    IN_DEVELOPMENT = "IN_DEVELOPMENT"
    LAUNCHED = "LAUNCHED"
    ARCHIVED = "ARCHIVED"


class IdeaCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    problem_statement: str = Field(..., min_length=10)
    proposed_solution: str = Field(..., min_length=10)
    industry: str = Field(..., min_length=2, max_length=100)
    target_market: str = Field(..., min_length=2, max_length=255)
    current_stage: IdeaLifecycleStage = IdeaLifecycleStage.DRAFT


class IdeaUpdate(BaseModel):
    title: str | None = Field(None, min_length=3, max_length=255)
    problem_statement: str | None = Field(None, min_length=10)
    proposed_solution: str | None = Field(None, min_length=10)
    industry: str | None = Field(None, min_length=2, max_length=100)
    target_market: str | None = Field(None, min_length=2, max_length=255)
    current_stage: IdeaLifecycleStage | None = None
    status: str | None = None
    validation_status: str | None = None


class IdeaResponse(BaseModel):
    id: str
    slug: str
    founder_id: str
    title: str
    problem_statement: str
    proposed_solution: str
    industry: str
    target_market: str
    current_stage: str
    status: str
    validation_status: str
    assigned_admin: str | None = None
    current_owner: str | None = None
    priority: str | None = None
    visibility: str = "PRIVATE"
    is_archived: bool = False
    started_at: str | None = None
    completed_at: str | None = None
    archived_at: str | None = None
    created_at: str
    updated_at: str
    created_by: str
    updated_by: str
    version: str = "1.0"
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class IdeaSummary(BaseModel):
    id: str
    slug: str
    title: str
    industry: str
    target_market: str
    current_stage: str
    status: str
    validation_status: str
    is_archived: bool = False
    updated_at: str


class IdeaPaginationResponse(BaseModel):
    items: list[IdeaResponse]
    total: int
    page: int
    limit: int
    total_pages: int
    version: str = "1.0"
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class IdeaStatsResponse(BaseModel):
    total_ideas: int = 0
    draft_count: int = 0
    validated_count: int = 0
    active_sprint_count: int = 0
    projects_count: int = 0
    archived_count: int = 0
    version: str = "1.0"
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

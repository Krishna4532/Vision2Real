from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, Field


class UserProfileSummary(BaseModel):
    id: str
    full_name: str
    email: str


class DashboardStats(BaseModel):
    ideas_count: int = 0
    validations_count: int = 0
    reports_count: int = 0
    projects_count: int = 0


class FounderJourneyStep(BaseModel):
    id: str
    name: str
    status: Literal["completed", "current", "upcoming"]
    description: str


class DashboardJourney(BaseModel):
    current_stage_id: str = "idea"
    current_stage_name: str = "Idea Intake"
    progress_percentage: int = 0
    steps: list[FounderJourneyStep] = Field(default_factory=list)


class IdeaSummary(BaseModel):
    id: str
    title: str
    status: str
    updated_at: str
    category: str | None = None


class ValidationSummary(BaseModel):
    id: str
    project_name: str
    score: int
    verdict: str
    recommendation: str


class BuildSummary(BaseModel):
    id: str
    sprint_name: str
    progress_percentage: int
    goals: list[str] = Field(default_factory=list)


class DashboardActivity(BaseModel):
    id: str
    timestamp_label: str
    title: str
    description: str
    type: Literal["validation", "idea", "sprint", "build", "system"]


class DashboardResponse(BaseModel):
    version: str = "1.0"
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    user: UserProfileSummary
    stats: DashboardStats
    journey: DashboardJourney
    latest_idea: IdeaSummary | None = None
    latest_validation: ValidationSummary | None = None
    active_build: BuildSummary | None = None
    recent_activity: list[DashboardActivity] = Field(default_factory=list)

from __future__ import annotations

from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import UserORM
from app.repositories.idea_repository import IdeaRepository
from app.schemas.dashboard import (
    BuildSummary,
    DashboardActivity,
    DashboardJourney,
    DashboardResponse,
    DashboardStats,
    FounderJourneyStep,
    IdeaSummary,
    UserProfileSummary,
    ValidationSummary,
)


class DashboardService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repository = IdeaRepository(db)

    async def get_founder_dashboard(self, user: UserORM) -> DashboardResponse:
        """Build and aggregate truthful founder dashboard data by reading the database directly."""
        
        # 1. User Profile Summary (from authenticated founder)
        user_summary = UserProfileSummary(
            id=user.id,
            full_name=user.full_name,
            email=user.email,
        )

        # 2. Aggregate Stats from Database via Repository
        counts = await self.repository.get_stats_counts(user.id)
        stats = DashboardStats(
            ideas_count=counts["total_ideas"],
            validations_count=counts["validated_count"],
            reports_count=counts["validated_count"],
            projects_count=counts["projects_count"],
        )

        # 3. Latest Active Idea Widget
        active_ideas, _ = await self.repository.find_all(
            founder_id=user.id,
            page=1,
            limit=1,
            sort_by="newest",
            include_archived=False,
        )

        latest_idea: IdeaSummary | None = None
        if active_ideas:
            first_idea = active_ideas[0]
            latest_idea = IdeaSummary(
                id=first_idea.id,
                title=first_idea.title,
                status=first_idea.current_stage,
                updated_at=first_idea.updated_at.strftime("%b %d, %Y"),
                category=first_idea.industry,
            )

        # 4. Founder Journey Steps (Calculated from actual database state)
        has_ideas = counts["total_ideas"] > 0
        has_validations = counts["validated_count"] > 0
        has_sprints = counts["active_sprint_count"] > 0
        has_builds = counts["projects_count"] > 0

        current_stage_id = "idea"
        current_stage_name = "Idea Intake"
        progress = 0

        if has_builds:
            current_stage_id = "build"
            current_stage_name = "Production Build"
            progress = 75
        elif has_sprints:
            current_stage_id = "sprint"
            current_stage_name = "Reality Sprint"
            progress = 50
        elif has_validations:
            current_stage_id = "validation"
            current_stage_name = "AI Validation"
            progress = 25
        elif has_ideas:
            current_stage_id = "idea"
            current_stage_name = "Idea Intake"
            progress = 10

        journey_steps = [
            FounderJourneyStep(
                id="idea",
                name="Idea Intake",
                status="completed" if has_ideas else "current",
                description="Raw startup idea structured & classified",
            ),
            FounderJourneyStep(
                id="validation",
                name="AI Validation",
                status="completed" if has_validations else ("current" if has_ideas and not has_validations else "upcoming"),
                description="Multi-agent evidence research & stress-testing",
            ),
            FounderJourneyStep(
                id="sprint",
                name="Reality Sprint",
                status="completed" if has_sprints else ("current" if has_validations and not has_sprints else "upcoming"),
                description="2-week intensive architecture & PRD scoping",
            ),
            FounderJourneyStep(
                id="build",
                name="Production Build",
                status="completed" if has_builds else ("current" if has_sprints and not has_builds else "upcoming"),
                description="Full-stack engineering & codebase delivery",
            ),
            FounderJourneyStep(
                id="launch",
                name="Market Launch",
                status="upcoming",
                description="Production deployment & customer onboarding",
            ),
        ]

        journey = DashboardJourney(
            current_stage_id=current_stage_id,
            current_stage_name=current_stage_name,
            progress_percentage=progress,
            steps=journey_steps,
        )

        # 5. Transform Structured Activity Events into Dashboard Presentation Objects
        raw_activities = await self.repository.get_recent_activities(user.id, limit=5)
        recent_activity: list[DashboardActivity] = []

        for act in raw_activities:
            meta = act.metadata_json or {}
            title = meta.get("title", "Startup Idea")

            if act.event_type == "idea_created":
                activity_title = "New Idea Created"
                desc = f"Added '{title}' in {meta.get('industry', 'Technology')} industry."
                act_type = "idea"
            elif act.event_type == "idea_updated":
                activity_title = "Idea Updated"
                desc = f"Updated details for '{title}' (Stage: {meta.get('stage', 'DRAFT')})."
                act_type = "idea"
            elif act.event_type == "idea_archived":
                activity_title = "Idea Archived"
                desc = f"Archived startup idea '{title}'."
                act_type = "system"
            elif act.event_type == "idea_restored":
                activity_title = "Idea Restored"
                desc = f"Restored startup idea '{title}' to portfolio."
                act_type = "idea"
            else:
                activity_title = "Workspace Activity"
                desc = f"Action recorded for '{title}'."
                act_type = "system"

            recent_activity.append(
                DashboardActivity(
                    id=act.id,
                    timestamp_label=act.created_at.strftime("%b %d, %Y"),
                    title=activity_title,
                    description=desc,
                    type=act_type,
                )
            )

        latest_validation: ValidationSummary | None = None
        active_build: BuildSummary | None = None

        return DashboardResponse(
            version="1.0",
            generated_at=datetime.now(timezone.utc).isoformat(),
            user=user_summary,
            stats=stats,
            journey=journey,
            latest_idea=latest_idea,
            latest_validation=latest_validation,
            active_build=active_build,
            recent_activity=recent_activity,
        )


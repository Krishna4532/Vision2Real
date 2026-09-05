from __future__ import annotations

import math
import re
import uuid
from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import UserORM
from app.models.idea import Idea, IdeaActivity
from app.repositories.idea_repository import IdeaRepository
from app.schemas.idea import (
    IdeaCreate,
    IdeaPaginationResponse,
    IdeaResponse,
    IdeaStatsResponse,
    IdeaUpdate,
)


def slugify(text: str) -> str:
    """Utility to turn titles into URL-safe slugs."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    text = re.sub(r"^-+|-+$", "", text)
    return text or "idea"


class IdeaService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repository = IdeaRepository(db)

    async def create_idea(self, founder: UserORM, data: IdeaCreate) -> IdeaResponse:
        """Create a new startup idea for the authenticated founder."""
        base_slug = slugify(data.title)
        unique_fragment = uuid.uuid4().hex[:6]
        slug = f"{base_slug}-{unique_fragment}"

        now = datetime.now(timezone.utc)
        idea = Idea(
            id=str(uuid.uuid4()),
            slug=slug,
            founder_id=founder.id,
            title=data.title,
            problem_statement=data.problem_statement,
            proposed_solution=data.proposed_solution,
            industry=data.industry,
            target_market=data.target_market,
            current_stage=data.current_stage.value,
            status="ACTIVE",
            validation_status="UNVALIDATED",
            visibility="PRIVATE",
            is_archived=False,
            created_at=now,
            updated_at=now,
            created_by=founder.id,
            updated_by=founder.id,
        )

        saved_idea = await self.repository.save(idea)

        # Structured Activity Logging
        activity = IdeaActivity(
            id=str(uuid.uuid4()),
            founder_id=founder.id,
            entity_type="idea",
            entity_id=saved_idea.id,
            event_type="idea_created",
            metadata_json={
                "title": saved_idea.title,
                "industry": saved_idea.industry,
                "stage": saved_idea.current_stage,
            },
            created_at=now,
        )
        await self.repository.save_activity(activity)

        return self._to_response(saved_idea)

    async def get_idea(self, founder: UserORM, identifier: str) -> IdeaResponse:
        """Get idea details by ID or Slug scoped strictly to founder."""
        idea = await self.repository.get_by_id_or_slug(identifier, founder_id=founder.id)
        if not idea:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Startup idea not found.",
            )
        return self._to_response(idea)

    async def list_ideas(
        self,
        founder: UserORM,
        page: int = 1,
        limit: int = 10,
        search: str | None = None,
        industry: str | None = None,
        stage: str | None = None,
        sort_by: str = "newest",
        include_archived: bool = False,
    ) -> IdeaPaginationResponse:
        """List founder ideas with filtering, search, sorting, and offset pagination."""
        items, total = await self.repository.find_all(
            founder_id=founder.id,
            page=page,
            limit=limit,
            search=search,
            industry=industry,
            stage=stage,
            sort_by=sort_by,
            include_archived=include_archived,
        )

        total_pages = math.ceil(total / limit) if limit > 0 else 0

        return IdeaPaginationResponse(
            items=[self._to_response(item) for item in items],
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages,
        )

    async def update_idea(self, founder: UserORM, idea_id: str, data: IdeaUpdate) -> IdeaResponse:
        """Update startup idea details and handle stage lifecycle transitions."""
        idea = await self.repository.get_by_id(idea_id, founder_id=founder.id)
        if not idea:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Startup idea not found.",
            )

        now = datetime.now(timezone.utc)
        if data.title is not None:
            idea.title = data.title
        if data.problem_statement is not None:
            idea.problem_statement = data.problem_statement
        if data.proposed_solution is not None:
            idea.proposed_solution = data.proposed_solution
        if data.industry is not None:
            idea.industry = data.industry
        if data.target_market is not None:
            idea.target_market = data.target_market
        if data.current_stage is not None:
            idea.current_stage = data.current_stage.value
        if data.status is not None:
            idea.status = data.status
        if data.validation_status is not None:
            idea.validation_status = data.validation_status

        idea.updated_at = now
        idea.updated_by = founder.id

        updated_idea = await self.repository.save(idea)

        # Structured Activity Logging
        activity = IdeaActivity(
            id=str(uuid.uuid4()),
            founder_id=founder.id,
            entity_type="idea",
            entity_id=updated_idea.id,
            event_type="idea_updated",
            metadata_json={
                "title": updated_idea.title,
                "stage": updated_idea.current_stage,
            },
            created_at=now,
        )
        await self.repository.save_activity(activity)

        return self._to_response(updated_idea)

    async def archive_idea(self, founder: UserORM, idea_id: str) -> IdeaResponse:
        """Archive a startup idea."""
        idea = await self.repository.get_by_id(idea_id, founder_id=founder.id)
        if not idea:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Startup idea not found.",
            )

        now = datetime.now(timezone.utc)
        idea.is_archived = True
        idea.archived_at = now
        idea.status = "ARCHIVED"
        idea.updated_at = now
        idea.updated_by = founder.id

        archived_idea = await self.repository.save(idea)

        # Structured Activity Logging
        activity = IdeaActivity(
            id=str(uuid.uuid4()),
            founder_id=founder.id,
            entity_type="idea",
            entity_id=archived_idea.id,
            event_type="idea_archived",
            metadata_json={"title": archived_idea.title},
            created_at=now,
        )
        await self.repository.save_activity(activity)

        return self._to_response(archived_idea)

    async def restore_idea(self, founder: UserORM, idea_id: str) -> IdeaResponse:
        """Restore an archived startup idea."""
        idea = await self.repository.get_by_id(idea_id, founder_id=founder.id)
        if not idea:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Startup idea not found.",
            )

        now = datetime.now(timezone.utc)
        idea.is_archived = False
        idea.archived_at = None
        idea.status = "ACTIVE"
        idea.updated_at = now
        idea.updated_by = founder.id

        restored_idea = await self.repository.save(idea)

        # Structured Activity Logging
        activity = IdeaActivity(
            id=str(uuid.uuid4()),
            founder_id=founder.id,
            entity_type="idea",
            entity_id=restored_idea.id,
            event_type="idea_restored",
            metadata_json={"title": restored_idea.title},
            created_at=now,
        )
        await self.repository.save_activity(activity)

        return self._to_response(restored_idea)

    async def get_idea_stats(self, founder: UserORM) -> IdeaStatsResponse:
        """Get truthful aggregated portfolio statistics."""
        stats = await self.repository.get_stats_counts(founder.id)
        return IdeaStatsResponse(**stats)

    def _to_response(self, idea: Idea) -> IdeaResponse:
        return IdeaResponse(
            id=idea.id,
            slug=idea.slug,
            founder_id=idea.founder_id,
            title=idea.title,
            problem_statement=idea.problem_statement,
            proposed_solution=idea.proposed_solution,
            industry=idea.industry,
            target_market=idea.target_market,
            current_stage=idea.current_stage,
            status=idea.status,
            validation_status=idea.validation_status,
            assigned_admin=idea.assigned_admin,
            current_owner=idea.current_owner,
            priority=idea.priority,
            visibility=idea.visibility,
            is_archived=idea.is_archived,
            started_at=idea.started_at.isoformat() if idea.started_at else None,
            completed_at=idea.completed_at.isoformat() if idea.completed_at else None,
            archived_at=idea.archived_at.isoformat() if idea.archived_at else None,
            created_at=idea.created_at.isoformat(),
            updated_at=idea.updated_at.isoformat(),
            created_by=idea.created_by,
            updated_by=idea.updated_by,
        )

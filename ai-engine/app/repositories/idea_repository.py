from __future__ import annotations

from typing import Sequence
from sqlalchemy import select, func, or_, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.idea import Idea, IdeaActivity


class IdeaRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def save(self, idea: Idea) -> Idea:
        self.db.add(idea)
        await self.db.commit()
        await self.db.refresh(idea)
        return idea

    async def get_by_id(self, idea_id: str, founder_id: str | None = None) -> Idea | None:
        stmt = select(Idea).where(Idea.id == idea_id)
        if founder_id:
            stmt = stmt.where(Idea.founder_id == founder_id)
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_by_slug(self, slug: str, founder_id: str | None = None) -> Idea | None:
        stmt = select(Idea).where(Idea.slug == slug)
        if founder_id:
            stmt = stmt.where(Idea.founder_id == founder_id)
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_by_id_or_slug(self, identifier: str, founder_id: str | None = None) -> Idea | None:
        stmt = select(Idea).where(or_(Idea.id == identifier, Idea.slug == identifier))
        if founder_id:
            stmt = stmt.where(Idea.founder_id == founder_id)
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def find_all(
        self,
        founder_id: str,
        page: int = 1,
        limit: int = 10,
        search: str | None = None,
        industry: str | None = None,
        stage: str | None = None,
        sort_by: str = "newest",
        include_archived: bool = False,
    ) -> tuple[Sequence[Idea], int]:
        """Find ideas with filtering, search, sorting, and offset pagination."""
        stmt = select(Idea).where(Idea.founder_id == founder_id)

        if not include_archived:
            stmt = stmt.where(Idea.is_archived == False)

        if search:
            search_pattern = f"%{search}%"
            stmt = stmt.where(
                or_(
                    Idea.title.ilike(search_pattern),
                    Idea.problem_statement.ilike(search_pattern),
                    Idea.proposed_solution.ilike(search_pattern),
                    Idea.target_market.ilike(search_pattern),
                )
            )

        if industry:
            stmt = stmt.where(Idea.industry.ilike(industry))

        if stage:
            stmt = stmt.where(Idea.current_stage == stage.upper())

        # Count total matching records before offset/limit
        count_stmt = select(func.count()).select_from(stmt.subquery())
        count_res = await self.db.execute(count_stmt)
        total = count_res.scalar_one_or_none() or 0

        # Apply sorting
        if sort_by == "oldest":
            stmt = stmt.order_by(asc(Idea.created_at))
        elif sort_by == "recently_updated":
            stmt = stmt.order_by(desc(Idea.updated_at))
        elif sort_by == "validation_score":
            stmt = stmt.order_by(desc(Idea.current_stage), desc(Idea.updated_at))
        else:  # "newest" default
            stmt = stmt.order_by(desc(Idea.created_at))

        # Isolated offset pagination calculation
        offset = (page - 1) * limit
        stmt = stmt.offset(offset).limit(limit)

        res = await self.db.execute(stmt)
        items = res.scalars().all()

        return items, total

    async def get_stats_counts(self, founder_id: str) -> dict[str, int]:
        """Aggregate truthful stats counts for founder portfolio."""
        base_stmt = select(Idea).where(Idea.founder_id == founder_id)

        total_res = await self.db.execute(select(func.count()).select_from(base_stmt.where(Idea.is_archived == False).subquery()))
        total_ideas = total_res.scalar_one_or_none() or 0

        draft_res = await self.db.execute(select(func.count()).select_from(base_stmt.where(Idea.is_archived == False, Idea.current_stage == "DRAFT").subquery()))
        draft_count = draft_res.scalar_one_or_none() or 0

        validated_res = await self.db.execute(select(func.count()).select_from(base_stmt.where(Idea.is_archived == False, Idea.current_stage == "VALIDATED").subquery()))
        validated_count = validated_res.scalar_one_or_none() or 0

        sprint_res = await self.db.execute(select(func.count()).select_from(base_stmt.where(Idea.is_archived == False, Idea.current_stage == "REALITY_SPRINT").subquery()))
        active_sprint_count = sprint_res.scalar_one_or_none() or 0

        projects_res = await self.db.execute(select(func.count()).select_from(base_stmt.where(Idea.is_archived == False, Idea.current_stage.in_(["BUILD_REQUESTED", "IN_DEVELOPMENT", "LAUNCHED"])).subquery()))
        projects_count = projects_res.scalar_one_or_none() or 0

        archived_res = await self.db.execute(select(func.count()).select_from(base_stmt.where(Idea.is_archived == True).subquery()))
        archived_count = archived_res.scalar_one_or_none() or 0

        return {
            "total_ideas": total_ideas,
            "draft_count": draft_count,
            "validated_count": validated_count,
            "active_sprint_count": active_sprint_count,
            "projects_count": projects_count,
            "archived_count": archived_count,
        }

    async def save_activity(self, activity: IdeaActivity) -> IdeaActivity:
        self.db.add(activity)
        await self.db.commit()
        await self.db.refresh(activity)
        return activity

    async def get_recent_activities(self, founder_id: str, limit: int = 10) -> Sequence[IdeaActivity]:
        stmt = (
            select(IdeaActivity)
            .where(IdeaActivity.founder_id == founder_id)
            .order_by(desc(IdeaActivity.created_at))
            .limit(limit)
        )
        res = await self.db.execute(stmt)
        return res.scalars().all()

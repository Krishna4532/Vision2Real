from __future__ import annotations

from typing import Optional, Sequence
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.auth import UserORM
from app.models.build_request import BuildRequest, BuildRequestTimelineEvent


class AdminBuildRequestRepository:
    """Persistence-only repository for Build Request operations in Admin HQ."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_build_requests(
        self,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        founder_id: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> tuple[Sequence[tuple[BuildRequest, UserORM]], int]:
        """Fetch paginated build requests with eagerly joined founder info."""
        base_stmt = select(BuildRequest, UserORM).join(
            UserORM, BuildRequest.founder_id == UserORM.id, isouter=True
        )

        # Search filter
        if search and search.strip():
            term = f"%{search.strip()}%"
            base_stmt = base_stmt.where(
                or_(
                    BuildRequest.title.ilike(term),
                    BuildRequest.startup_name.ilike(term),
                    BuildRequest.description.ilike(term),
                    UserORM.full_name.ilike(term),
                    UserORM.email.ilike(term),
                )
            )

        # Status filter
        if status and status.strip() and status.upper() != "ALL":
            base_stmt = base_stmt.where(BuildRequest.status == status.strip().upper())

        # Priority filter
        if priority and priority.strip() and priority.upper() != "ALL":
            base_stmt = base_stmt.where(BuildRequest.priority == priority.strip().upper())

        # Founder filter
        if founder_id and founder_id.strip():
            base_stmt = base_stmt.where(BuildRequest.founder_id == founder_id.strip())

        # Count query
        count_stmt = select(func.count()).select_from(base_stmt.subquery())
        total: int = (await self.session.execute(count_stmt)).scalar_one() or 0

        # Sorting
        sort_col = {
            "title": BuildRequest.title,
            "status": BuildRequest.status,
            "priority": BuildRequest.priority,
            "progress_percentage": BuildRequest.progress_percentage,
            "updated_at": BuildRequest.updated_at,
        }.get(sort_by, BuildRequest.created_at)

        if sort_order.lower() == "asc":
            base_stmt = base_stmt.order_by(sort_col.asc())
        else:
            base_stmt = base_stmt.order_by(sort_col.desc())

        # Pagination
        offset = (page - 1) * page_size
        base_stmt = base_stmt.offset(offset).limit(page_size)

        result = await self.session.execute(base_stmt)
        return result.all(), total

    async def get_build_request_by_id(self, request_id: str) -> Optional[BuildRequest]:
        """Fetch a single BuildRequest by ID with founder, attachments, and timeline events eagerly loaded."""
        stmt = (
            select(BuildRequest)
            .options(
                selectinload(BuildRequest.founder),
                selectinload(BuildRequest.attachments),
                selectinload(BuildRequest.timeline_events),
            )
            .where(BuildRequest.id == request_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def save_build_request(self, request: BuildRequest) -> None:
        """Persist build request state updates."""
        self.session.add(request)
        await self.session.commit()

    async def add_timeline_event(self, event: BuildRequestTimelineEvent) -> None:
        """Persist a new BuildRequestTimelineEvent audit entry."""
        self.session.add(event)
        await self.session.commit()

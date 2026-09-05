from __future__ import annotations

from typing import Optional, Sequence
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.auth import UserORM
from app.models.reality_sprint import RealitySprint, RealitySprintActivity, RealitySprintAttachment


class AdminRealitySprintRepository:
    """Persistence-only repository for Reality Sprint operations in Admin HQ."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_reality_sprints(
        self,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        status: Optional[str] = None,
        founder_id: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> tuple[Sequence[tuple[RealitySprint, UserORM]], int]:
        """Fetch paginated reality sprints with eagerly joined founder info."""
        base_stmt = select(RealitySprint, UserORM).join(
            UserORM, RealitySprint.founder_id == UserORM.id, isouter=True
        )

        # Search filter
        if search and search.strip():
            term = f"%{search.strip()}%"
            base_stmt = base_stmt.where(
                or_(
                    RealitySprint.title.ilike(term),
                    RealitySprint.startup_name.ilike(term),
                    RealitySprint.description.ilike(term),
                    UserORM.full_name.ilike(term),
                    UserORM.email.ilike(term),
                )
            )

        # Status filter
        if status and status.strip() and status.upper() != "ALL":
            base_stmt = base_stmt.where(RealitySprint.status == status.strip().upper())

        # Founder filter
        if founder_id and founder_id.strip():
            base_stmt = base_stmt.where(RealitySprint.founder_id == founder_id.strip())

        # Count query
        count_stmt = select(func.count()).select_from(base_stmt.subquery())
        total: int = (await self.session.execute(count_stmt)).scalar_one() or 0

        # Sorting
        sort_col = {
            "title": RealitySprint.title,
            "status": RealitySprint.status,
            "updated_at": RealitySprint.updated_at,
        }.get(sort_by, RealitySprint.created_at)

        if sort_order.lower() == "asc":
            base_stmt = base_stmt.order_by(sort_col.asc())
        else:
            base_stmt = base_stmt.order_by(sort_col.desc())

        # Pagination
        offset = (page - 1) * page_size
        base_stmt = base_stmt.offset(offset).limit(page_size)

        result = await self.session.execute(base_stmt)
        return result.all(), total

    async def get_reality_sprint_by_id(self, sprint_id: str) -> Optional[RealitySprint]:
        """Fetch a single RealitySprint by ID with founder and activities eagerly loaded."""
        stmt = (
            select(RealitySprint)
            .options(
                selectinload(RealitySprint.founder),
                selectinload(RealitySprint.activities),
                selectinload(RealitySprint.attachments),
            )
            .where(RealitySprint.id == sprint_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_attachment_by_id(self, sprint_id: str, attachment_id: str) -> Optional[RealitySprintAttachment]:
        """Fetch an attachment record by sprint ID and attachment ID."""
        stmt = select(RealitySprintAttachment).where(
            RealitySprintAttachment.id == attachment_id,
            RealitySprintAttachment.reality_sprint_id == sprint_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def save_sprint(self, sprint: RealitySprint) -> None:
        """Persist sprint state updates."""
        self.session.add(sprint)
        await self.session.commit()

    async def add_activity(self, activity: RealitySprintActivity) -> None:
        """Persist a new RealitySprintActivity audit entry."""
        self.session.add(activity)
        await self.session.commit()

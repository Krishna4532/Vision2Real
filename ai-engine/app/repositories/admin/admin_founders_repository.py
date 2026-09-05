from __future__ import annotations

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import UserORM
from app.models.build_request import BuildRequest, BuildRequestTimelineEvent
from app.models.reality_sprint import RealitySprint
from app.schemas.admin_founders import (
    FounderActivityItem,
    FounderDetailResponse,
    FounderListItemResponse,
    FounderSubmissionItem,
    FounderWorkspaceSummary,
    PaginatedFoundersResponse,
)


class AdminFoundersRepository:
    """
    Repository for Admin HQ – Founder Management.

    Responsibilities:
    - Paginated, searchable, filterable founder list with aggregate submission counts.
    - Full founder detail: profile + workspace summary + submissions + activity feed.

    Design constraints:
    - No N+1 queries: counts are gathered with scalar subqueries.
    - Activity is derived from Build Request timeline events (append-only audit trail).
    - No mutation – this is a read-only module.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ------------------------------------------------------------------
    # Founder List
    # ------------------------------------------------------------------

    async def list_founders(
        self,
        *,
        page: int,
        page_size: int,
        search: str | None,
        status_filter: str | None,
        sort_by: str,
        sort_order: str,
    ) -> PaginatedFoundersResponse:
        """
        Return a paginated, searchable list of Founders (role = FOUNDER) with
        per-founder submission counts.

        search      – matches against full_name OR email (case-insensitive).
        status_filter – "active" | "inactive" | None (all)
        sort_by     – "created_at" | "full_name" | "last_login_at"
        sort_order  – "asc" | "desc"
        """
        from app.core.roles import Roles

        # --- Scalar subqueries for aggregate counts (no N+1) ---
        validations_sq = (
            select(func.count())
            .where(BuildRequest.founder_id == UserORM.id)
            .correlate(UserORM)
            .scalar_subquery()
        )
        reality_sprints_sq = (
            select(func.count())
            .where(RealitySprint.founder_id == UserORM.id)
            .correlate(UserORM)
            .scalar_subquery()
        )
        build_requests_sq = (
            select(func.count())
            .where(BuildRequest.founder_id == UserORM.id)
            .correlate(UserORM)
            .scalar_subquery()
        )

        # Base query – only FOUNDER role accounts
        base_stmt = select(
            UserORM,
            validations_sq.label("validations_count"),
            reality_sprints_sq.label("reality_sprints_count"),
            build_requests_sq.label("build_requests_count"),
        ).where(UserORM.role == Roles.FOUNDER)

        # --- Search filter ---
        if search and search.strip():
            term = f"%{search.strip()}%"
            base_stmt = base_stmt.where(
                or_(
                    UserORM.full_name.ilike(term),
                    UserORM.email.ilike(term),
                )
            )

        # --- Status filter ---
        if status_filter == "active":
            base_stmt = base_stmt.where(UserORM.is_active.is_(True))
        elif status_filter == "inactive":
            base_stmt = base_stmt.where(UserORM.is_active.is_(False))

        # --- Total count (before pagination) ---
        count_stmt = select(func.count()).select_from(base_stmt.subquery())
        total: int = (await self.db.execute(count_stmt)).scalar_one() or 0

        # --- Sorting ---
        sort_col = {
            "full_name": UserORM.full_name,
            "last_login_at": UserORM.last_login_at,
        }.get(sort_by, UserORM.created_at)

        if sort_order == "asc":
            base_stmt = base_stmt.order_by(sort_col.asc().nulls_last())
        else:
            base_stmt = base_stmt.order_by(sort_col.desc().nulls_last())

        # --- Pagination ---
        offset = (page - 1) * page_size
        base_stmt = base_stmt.offset(offset).limit(page_size)

        rows = (await self.db.execute(base_stmt)).all()

        items: list[FounderListItemResponse] = []
        for row in rows:
            user: UserORM = row[0]
            items.append(
                FounderListItemResponse(
                    id=user.id,
                    full_name=user.full_name,
                    email=user.email,
                    role=user.role,
                    auth_provider=user.auth_provider,
                    is_active=user.is_active,
                    is_verified=user.is_verified,
                    created_at=user.created_at,
                    last_login_at=user.last_login_at,
                    validations_count=row[1] or 0,
                    reality_sprints_count=row[2] or 0,
                    build_requests_count=row[3] or 0,
                )
            )

        total_pages = max(1, (total + page_size - 1) // page_size)

        return PaginatedFoundersResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    # ------------------------------------------------------------------
    # Founder Detail
    # ------------------------------------------------------------------

    async def get_founder_by_id(self, founder_id: str) -> UserORM | None:
        """Fetch the UserORM for a Founder by id."""
        result = await self.db.execute(
            select(UserORM).where(UserORM.id == founder_id)
        )
        return result.scalar_one_or_none()

    async def get_founder_workspace_summary(self, founder_id: str) -> FounderWorkspaceSummary:
        """Return aggregate submission counts for a single founder."""
        reality_sprints_count: int = (
            await self.db.execute(
                select(func.count(RealitySprint.id)).where(
                    RealitySprint.founder_id == founder_id
                )
            )
        ).scalar_one() or 0

        build_requests_count: int = (
            await self.db.execute(
                select(func.count(BuildRequest.id)).where(
                    BuildRequest.founder_id == founder_id
                )
            )
        ).scalar_one() or 0

        return FounderWorkspaceSummary(
            validations_count=0,          # Validation is a separate future module
            reality_sprints_count=reality_sprints_count,
            build_requests_count=build_requests_count,
            projects_count=0,             # Projects module not yet implemented
        )

    async def get_founder_submissions(
        self, founder_id: str, limit: int = 20
    ) -> list[FounderSubmissionItem]:
        """
        Return the most recent submissions (Reality Sprints + Build Requests)
        for a founder, unified and sorted by created_at desc.
        """
        # Reality Sprints
        rs_rows = (
            await self.db.execute(
                select(RealitySprint)
                .where(RealitySprint.founder_id == founder_id)
                .order_by(RealitySprint.created_at.desc())
                .limit(limit)
            )
        ).scalars().all()

        # Build Requests
        br_rows = (
            await self.db.execute(
                select(BuildRequest)
                .where(BuildRequest.founder_id == founder_id)
                .order_by(BuildRequest.created_at.desc())
                .limit(limit)
            )
        ).scalars().all()

        submissions: list[FounderSubmissionItem] = []

        for rs in rs_rows:
            submissions.append(
                FounderSubmissionItem(
                    id=rs.id,
                    type="REALITY_SPRINT",
                    title=rs.title,
                    status=rs.status,
                    priority=rs.priority,
                    created_at=rs.created_at,
                )
            )

        for br in br_rows:
            submissions.append(
                FounderSubmissionItem(
                    id=br.id,
                    type="BUILD_REQUEST",
                    title=br.title,
                    status=br.status,
                    priority=br.priority,
                    created_at=br.created_at,
                )
            )

        # Unified sort by created_at desc, take top `limit`
        submissions.sort(key=lambda s: s.created_at, reverse=True)
        return submissions[:limit]

    async def get_founder_activity(
        self, founder_id: str, limit: int = 30
    ) -> list[FounderActivityItem]:
        """
        Return recent activity for a founder derived from Build Request
        timeline events — the append-only audit trail.
        """
        rows = (
            await self.db.execute(
                select(BuildRequestTimelineEvent)
                .join(
                    BuildRequest,
                    BuildRequestTimelineEvent.build_request_id == BuildRequest.id,
                )
                .where(BuildRequest.founder_id == founder_id)
                .order_by(BuildRequestTimelineEvent.created_at.desc())
                .limit(limit)
            )
        ).scalars().all()

        return [
            FounderActivityItem(
                id=ev.id,
                title=ev.title,
                description=ev.description,
                event_type=ev.event_type,
                created_at=ev.created_at,
            )
            for ev in rows
        ]

    async def get_founder_detail(self, founder_id: str) -> FounderDetailResponse | None:
        """
        Assemble the full operational Founder Detail view.
        Returns None if the founder does not exist.
        """
        user = await self.get_founder_by_id(founder_id)
        if user is None:
            return None

        summary = await self.get_founder_workspace_summary(founder_id)
        submissions = await self.get_founder_submissions(founder_id, limit=20)
        activities = await self.get_founder_activity(founder_id, limit=30)

        return FounderDetailResponse(
            id=user.id,
            full_name=user.full_name,
            email=user.email,
            role=user.role,
            auth_provider=user.auth_provider,
            is_active=user.is_active,
            is_verified=user.is_verified,
            created_at=user.created_at,
            last_login_at=user.last_login_at,
            summary=summary,
            submissions=submissions,
            activities=activities,
        )

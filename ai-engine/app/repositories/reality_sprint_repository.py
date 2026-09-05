from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.reality_sprint import RealitySprint, RealitySprintAttachment


class RealitySprintRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_request(self, request: RealitySprint) -> RealitySprint:
        self.db.add(request)
        await self.db.commit()
        await self.db.refresh(request)
        return await self.get_request(request.id, request.founder_id, include_archived=True)  # type: ignore[return-value]

    async def update_request(self, request: RealitySprint) -> RealitySprint:
        request.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(request)
        return await self.get_request(request.id, request.founder_id, include_archived=True)  # type: ignore[return-value]

    async def get_request(
        self, request_id: str, founder_id: str, include_archived: bool = False
    ) -> RealitySprint | None:
        stmt = select(RealitySprint).where(
            RealitySprint.id == request_id, RealitySprint.founder_id == founder_id
        )
        if not include_archived:
            stmt = stmt.where(RealitySprint.is_archived == False)  # noqa: E712
        stmt = stmt.options(selectinload(RealitySprint.attachments)).execution_options(populate_existing=True)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_requests(
        self,
        founder_id: str | None = None,
        page: int = 1,
        page_size: int = 20,
        status: str | None = None,
        priority: str | None = None,
        target_market: str | None = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        search: str | None = None,
        include_archived: bool = False,
    ) -> tuple[list[RealitySprint], int]:
        filters = []
        if not include_archived:
            filters.append(RealitySprint.is_archived == False)  # noqa: E712
        if founder_id:
            filters.append(RealitySprint.founder_id == founder_id)
        if status:
            filters.append(RealitySprint.status == status)
        if priority:
            filters.append(RealitySprint.priority == priority)
        if target_market:
            filters.append(RealitySprint.target_market.ilike(f"%{target_market}%"))
        if search:
            pattern = f"%{search}%"
            filters.append(
                or_(
                    RealitySprint.title.ilike(pattern),
                    RealitySprint.startup_name.ilike(pattern),
                    RealitySprint.description.ilike(pattern),
                    RealitySprint.target_customer.ilike(pattern),
                    RealitySprint.target_market.ilike(pattern),
                )
            )

        total = (
            await self.db.execute(select(func.count()).select_from(RealitySprint).where(*filters))
        ).scalar_one()

        allowed_sort = {
            "created_at": RealitySprint.created_at,
            "updated_at": RealitySprint.updated_at,
            "title": RealitySprint.title,
            "priority": RealitySprint.priority,
            "status": RealitySprint.status,
        }
        sort_column = allowed_sort.get(sort_by, RealitySprint.created_at)
        order = sort_column.asc() if sort_order == "asc" else sort_column.desc()

        result = await self.db.execute(
            select(RealitySprint)
            .where(*filters)
            .options(selectinload(RealitySprint.attachments))
            .order_by(order, RealitySprint.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return list(result.scalars().unique().all()), total

    async def list_founder_requests(
        self, founder_id: str, **kwargs: Any
    ) -> tuple[list[RealitySprint], int]:
        return await self.list_requests(founder_id=founder_id, **kwargs)

    async def search_requests(
        self, founder_id: str, query: str, page: int = 1, page_size: int = 20, include_archived: bool = False
    ) -> tuple[list[RealitySprint], int]:
        return await self.list_requests(founder_id=founder_id, page=page, page_size=page_size, search=query, include_archived=include_archived)

    async def add_attachment(self, attachment: RealitySprintAttachment) -> RealitySprintAttachment:
        self.db.add(attachment)
        await self.db.commit()
        await self.db.refresh(attachment)
        return attachment

    async def analytics(self, founder_id: str) -> dict[str, Any]:
        requests, _ = await self.list_requests(founder_id=founder_id, page=1, page_size=100000, include_archived=False)

        total_requests = len(requests)
        submitted = sum(1 for r in requests if r.status == "SUBMITTED")
        under_review = sum(1 for r in requests if r.status == "UNDER_REVIEW")
        accepted = sum(1 for r in requests if r.status == "ACCEPTED")
        scheduled = sum(1 for r in requests if r.status == "SCHEDULED")
        in_progress = sum(1 for r in requests if r.status == "IN_PROGRESS")
        completed_items = [r for r in requests if r.status == "COMPLETED"]
        completed = len(completed_items)
        cancelled = sum(1 for r in requests if r.status == "CANCELLED")
        pending = submitted + under_review + accepted + scheduled

        accepted_or_beyond = accepted + scheduled + in_progress + completed
        acceptance_rate = (accepted_or_beyond / total_requests * 100.0) if total_requests > 0 else 0.0
        completion_rate = (completed / total_requests * 100.0) if total_requests > 0 else 0.0

        # Review time computation (in hours)
        review_times = []
        for r in requests:
            start_ts = r.submitted_at or r.created_at
            end_ts = r.review_started_at or r.accepted_at
            if start_ts and end_ts:
                diff_hours = (end_ts - start_ts).total_seconds() / 3600.0
                if diff_hours >= 0:
                    review_times.append(diff_hours)
        avg_review_time = (sum(review_times) / len(review_times)) if review_times else 0.0

        # Completion time computation (in days)
        completion_times = []
        for r in completed_items:
            start_ts = r.started_at or r.submitted_at or r.created_at
            end_ts = r.completed_at or r.updated_at
            if start_ts and end_ts:
                diff_days = (end_ts - start_ts).total_seconds() / 86400.0
                if diff_days >= 0:
                    completion_times.append(diff_days)
        avg_completion_time = (sum(completion_times) / len(completion_times)) if completion_times else 0.0

        markets = [r.target_market for r in requests if r.target_market]
        stages = [r.founder_stage for r in requests if r.founder_stage]

        def most_common(values: list[str]) -> str:
            return max(set(values), key=values.count) if values else ""

        return {
            "total_requests": total_requests,
            "submitted": submitted,
            "under_review": under_review,
            "accepted": accepted,
            "scheduled": scheduled,
            "in_progress": in_progress,
            "completed": completed,
            "cancelled": cancelled,
            "pending": pending,
            "acceptance_rate": round(acceptance_rate, 2),
            "completion_rate": round(completion_rate, 2),
            "average_review_time": round(avg_review_time, 2),
            "average_completion_time": round(avg_completion_time, 2),
            "latest_request": requests[0].id if requests else "",
            "most_requested_target_market": most_common(markets),
            "most_requested_founder_stage": most_common(stages),
        }


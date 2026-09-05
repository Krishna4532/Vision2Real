from __future__ import annotations

from typing import Any, Sequence
from collections import Counter

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.build_request import (
    BuildRequest,
    BuildRequestAttachment,
    BuildRequestMessage,
    BuildRequestTimelineEvent,
)


class BuildRequestRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_request(self, request: BuildRequest) -> BuildRequest:
        self.db.add(request)
        await self.db.commit()
        return await self.get_request(request.id, request.founder_id, include_archived=True)  # type: ignore

    async def update_request(self, request: BuildRequest) -> BuildRequest:
        await self.db.commit()
        return await self.get_request(request.id, request.founder_id, include_archived=True)  # type: ignore

    async def get_request(self, request_id: str, founder_id: str, include_archived: bool = False) -> BuildRequest | None:
        stmt = (
            select(BuildRequest)
            .options(
                selectinload(BuildRequest.attachments),
                selectinload(BuildRequest.timeline_events),
                selectinload(BuildRequest.messages),
            )
            .where(BuildRequest.id == request_id, BuildRequest.founder_id == founder_id)
        )
        if not include_archived:
            stmt = stmt.where(BuildRequest.is_archived.is_(False))

        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_founder_requests(
        self,
        founder_id: str,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
        status: str | None = None,
        priority: str | None = None,
        product_category: str | None = None,
        target_market: str | None = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        include_archived: bool = False,
    ) -> tuple[Sequence[BuildRequest], int]:
        stmt = select(BuildRequest).where(BuildRequest.founder_id == founder_id)

        if not include_archived:
            stmt = stmt.where(BuildRequest.is_archived.is_(False))
        if status:
            stmt = stmt.where(BuildRequest.status == status)
        if priority:
            stmt = stmt.where(BuildRequest.priority == priority)
        if product_category:
            stmt = stmt.where(BuildRequest.product_category == product_category)
        if target_market:
            stmt = stmt.where(BuildRequest.target_market == target_market)

        if search:
            term = f"%{search}%"
            stmt = stmt.where(
                or_(
                    BuildRequest.title.ilike(term),
                    BuildRequest.startup_name.ilike(term),
                    BuildRequest.description.ilike(term),
                    BuildRequest.product_category.ilike(term),
                    BuildRequest.target_customer.ilike(term),
                    BuildRequest.target_market.ilike(term),
                )
            )

        # Count total records before pagination
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar_one() or 0

        # Sorting
        sort_col = getattr(BuildRequest, sort_by, BuildRequest.created_at)
        if sort_order.lower() == "asc":
            stmt = stmt.order_by(sort_col.asc())
        else:
            stmt = stmt.order_by(sort_col.desc())

        # Pagination
        offset = (page - 1) * page_size
        stmt = stmt.offset(offset).limit(page_size)

        result = await self.db.execute(stmt)
        return result.scalars().all(), total

    async def add_attachment(self, attachment: BuildRequestAttachment) -> BuildRequestAttachment:
        self.db.add(attachment)
        await self.db.commit()
        await self.db.refresh(attachment)
        return attachment

    async def add_timeline_event(self, event: BuildRequestTimelineEvent) -> BuildRequestTimelineEvent:
        self.db.add(event)
        await self.db.commit()
        await self.db.refresh(event)
        return event

    async def get_timeline(self, request_id: str) -> Sequence[BuildRequestTimelineEvent]:
        stmt = (
            select(BuildRequestTimelineEvent)
            .where(BuildRequestTimelineEvent.build_request_id == request_id)
            .order_by(BuildRequestTimelineEvent.created_at.asc())
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def add_message(self, message: BuildRequestMessage) -> BuildRequestMessage:
        self.db.add(message)
        await self.db.commit()
        await self.db.refresh(message)
        return message

    async def get_messages(self, request_id: str) -> Sequence[BuildRequestMessage]:
        stmt = (
            select(BuildRequestMessage)
            .where(BuildRequestMessage.build_request_id == request_id)
            .order_by(BuildRequestMessage.created_at.asc())
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_by_idempotency_key(self, founder_id: str, idempotency_key: str) -> BuildRequest | None:
        stmt = (
            select(BuildRequest)
            .options(
                selectinload(BuildRequest.attachments),
                selectinload(BuildRequest.timeline_events),
                selectinload(BuildRequest.messages),
            )
            .where(BuildRequest.founder_id == founder_id, BuildRequest.idempotency_key == idempotency_key)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def analytics(self, founder_id: str, include_archived: bool = False) -> dict[str, Any]:
        stmt = select(BuildRequest).where(BuildRequest.founder_id == founder_id)
        if not include_archived:
            stmt = stmt.where(BuildRequest.is_archived.is_(False))
        res = await self.db.execute(stmt)
        requests = res.scalars().all()


        if not requests:
            return {
                "total_requests": 0,
                "active_requests": 0,
                "completed_requests": 0,
                "cancelled_requests": 0,
                "average_progress": 0.0,
                "average_completion_time_days": 0.0,
                "completion_rate": 0.0,
                "most_requested_category": "",
                "most_requested_market": "",
                "latest_request": "",
            }

        total_requests = len(requests)
        completed_requests = sum(1 for r in requests if r.status == "COMPLETED")
        cancelled_requests = sum(1 for r in requests if r.status == "CANCELLED")
        active_requests = sum(1 for r in requests if r.status not in ("COMPLETED", "CANCELLED"))

        avg_progress = round(sum(r.progress_percentage for r in requests) / total_requests, 2)
        completion_rate = round((completed_requests / total_requests) * 100.0, 2)

        completion_times = [
            (r.completed_at - r.created_at).total_seconds() / 86400.0
            for r in requests
            if r.status == "COMPLETED" and r.completed_at and r.created_at
        ]
        avg_completion_time = round(sum(completion_times) / len(completion_times), 2) if completion_times else 0.0

        categories = [r.product_category for r in requests if r.product_category]
        most_requested_category = Counter(categories).most_common(1)[0][0] if categories else ""

        markets = [r.target_market for r in requests if r.target_market]
        most_requested_market = Counter(markets).most_common(1)[0][0] if markets else ""

        sorted_by_date = sorted(requests, key=lambda r: r.created_at, reverse=True)
        latest_request = sorted_by_date[0].title if sorted_by_date else ""

        return {
            "total_requests": total_requests,
            "active_requests": active_requests,
            "completed_requests": completed_requests,
            "cancelled_requests": cancelled_requests,
            "average_progress": avg_progress,
            "average_completion_time_days": avg_completion_time,
            "completion_rate": completion_rate,
            "most_requested_category": most_requested_category,
            "most_requested_market": most_requested_market,
            "latest_request": latest_request,
        }

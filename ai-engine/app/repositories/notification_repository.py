from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Sequence
from sqlalchemy import func, or_, select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification, NotificationPreference, PushSubscription


class NotificationRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_notification(self, notification: Notification) -> Notification:
        self.db.add(notification)
        await self.db.commit()
        await self.db.refresh(notification)
        return notification

    async def get_notification(self, notification_id: str, founder_id: str) -> Notification | None:
        stmt = (
            select(Notification)
            .where(
                Notification.id == notification_id,
                Notification.founder_id == founder_id,
                Notification.is_dismissed.is_(False),
            )
        )
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def list_notifications(
        self,
        founder_id: str,
        category: str | None = None,
        is_read: bool | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[Sequence[Notification], int, int]:
        stmt = (
            select(Notification)
            .where(
                Notification.founder_id == founder_id,
                Notification.is_dismissed.is_(False),
            )
        )

        if category:
            stmt = stmt.where(Notification.category == category.upper())
        if is_read is not None:
            stmt = stmt.where(Notification.is_read == is_read)
        if search:
            search_pattern = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(
                    Notification.title.ilike(search_pattern),
                    Notification.body.ilike(search_pattern),
                    Notification.notification_type.ilike(search_pattern),
                )
            )

        # Count total matching
        count_stmt = select(func.count()).select_from(stmt.subquery())
        count_res = await self.db.execute(count_stmt)
        total = count_res.scalar_one() or 0

        # Unread count total for founder
        unread_count = await self.get_unread_count(founder_id)

        # Pagination & sorting (created_at desc)
        offset = (page - 1) * page_size
        stmt = stmt.order_by(Notification.created_at.desc()).offset(offset).limit(page_size)

        result = await self.db.execute(stmt)
        items = result.scalars().all()

        return items, unread_count, total

    async def get_unread_count(self, founder_id: str) -> int:
        stmt = (
            select(func.count(Notification.id))
            .where(
                Notification.founder_id == founder_id,
                Notification.is_read.is_(False),
                Notification.is_dismissed.is_(False),
            )
        )
        res = await self.db.execute(stmt)
        return res.scalar_one() or 0

    async def mark_as_read(self, notification_id: str, founder_id: str) -> Notification | None:
        notification = await self.get_notification(notification_id, founder_id)
        if not notification:
            return None

        if not notification.is_read:
            notification.is_read = True
            notification.read_at = datetime.now(timezone.utc)
            await self.db.commit()
            await self.db.refresh(notification)

        return notification

    async def mark_all_as_read(self, founder_id: str) -> int:
        now = datetime.now(timezone.utc)
        stmt = (
            update(Notification)
            .where(
                Notification.founder_id == founder_id,
                Notification.is_read.is_(False),
                Notification.is_dismissed.is_(False),
            )
            .values(is_read=True, read_at=now)
        )
        res = await self.db.execute(stmt)
        await self.db.commit()
        return res.rowcount or 0

    async def dismiss_notification(self, notification_id: str, founder_id: str) -> bool:
        """Soft delete notification — sets is_dismissed=True to preserve audit analytics."""
        notification = await self.get_notification(notification_id, founder_id)
        if not notification:
            return False

        notification.is_dismissed = True
        notification.dismissed_at = datetime.now(timezone.utc)
        await self.db.commit()
        return True

    async def delete_read_notifications(self, founder_id: str) -> int:
        """Soft-dismiss all read notifications for a founder."""
        now = datetime.now(timezone.utc)
        stmt = (
            update(Notification)
            .where(
                Notification.founder_id == founder_id,
                Notification.is_read.is_(True),
                Notification.is_dismissed.is_(False),
            )
            .values(is_dismissed=True, dismissed_at=now)
        )
        res = await self.db.execute(stmt)
        await self.db.commit()
        return res.rowcount or 0

    # ── Preferences ──────────────────────────────────────────────────────────

    async def get_or_create_preferences(self, founder_id: str) -> NotificationPreference:
        stmt = select(NotificationPreference).where(NotificationPreference.founder_id == founder_id)
        res = await self.db.execute(stmt)
        pref = res.scalar_one_or_none()

        if not pref:
            pref = NotificationPreference(founder_id=founder_id)
            self.db.add(pref)
            await self.db.commit()
            await self.db.refresh(pref)

        return pref

    async def update_preferences(self, founder_id: str, updates: dict) -> NotificationPreference:
        pref = await self.get_or_create_preferences(founder_id)
        for key, val in updates.items():
            if val is not None and hasattr(pref, key):
                setattr(pref, key, val)
        pref.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(pref)
        return pref

    # ── Push Subscriptions ───────────────────────────────────────────────────

    async def save_push_subscription(self, subscription: PushSubscription) -> PushSubscription:
        # De-duplicate endpoint if it exists
        stmt = select(PushSubscription).where(PushSubscription.endpoint == subscription.endpoint)
        res = await self.db.execute(stmt)
        existing = res.scalar_one_or_none()

        if existing:
            existing.founder_id = subscription.founder_id
            existing.p256dh_key = subscription.p256dh_key
            existing.auth_key = subscription.auth_key
            existing.user_agent = subscription.user_agent
            existing.last_used_at = datetime.now(timezone.utc)
            await self.db.commit()
            await self.db.refresh(existing)
            return existing

        self.db.add(subscription)
        await self.db.commit()
        await self.db.refresh(subscription)
        return subscription

    async def delete_push_subscription(self, founder_id: str, endpoint: str) -> bool:
        stmt = delete(PushSubscription).where(
            PushSubscription.founder_id == founder_id,
            PushSubscription.endpoint == endpoint,
        )
        res = await self.db.execute(stmt)
        await self.db.commit()
        return (res.rowcount or 0) > 0

    async def get_founder_push_subscriptions(self, founder_id: str) -> Sequence[PushSubscription]:
        stmt = select(PushSubscription).where(PushSubscription.founder_id == founder_id)
        res = await self.db.execute(stmt)
        return res.scalars().all()

    async def delete_subscription_by_endpoint(self, endpoint: str) -> None:
        stmt = delete(PushSubscription).where(PushSubscription.endpoint == endpoint)
        await self.db.execute(stmt)
        await self.db.commit()

    # ── Analytics & Cleanup ───────────────────────────────────────────────────

    async def get_analytics(self, founder_id: str) -> dict:
        total_stmt = select(func.count(Notification.id)).where(
            Notification.founder_id == founder_id,
            Notification.is_dismissed.is_(False),
        )
        total_res = await self.db.execute(total_stmt)
        total_count = total_res.scalar_one() or 0

        unread_count = await self.get_unread_count(founder_id)
        read_count = total_count - unread_count
        read_rate = round(read_count / total_count, 4) if total_count > 0 else 1.0

        # Category breakdown
        cat_stmt = (
            select(
                Notification.category,
                func.count(Notification.id).label("total"),
                func.sum(func.cast(Notification.is_read.is_(False), func.integer if self.db.bind and self.db.bind.dialect.name != 'postgresql' else func.Integer)).label("unread")
            )
            .where(
                Notification.founder_id == founder_id,
                Notification.is_dismissed.is_(False),
            )
            .group_by(Notification.category)
        )
        cat_res = await self.db.execute(cat_stmt)
        cat_rows = cat_res.all()

        breakdown = []
        for cat, cat_tot, cat_unr in cat_rows:
            breakdown.append({
                "category": cat,
                "total": cat_tot or 0,
                "unread": int(cat_unr or 0),
            })

        return {
            "total_count": total_count,
            "unread_count": unread_count,
            "read_rate": read_rate,
            "category_breakdown": breakdown,
        }

    async def cleanup_expired_and_old_dismissed(self) -> int:
        now = datetime.now(timezone.utc)
        cutoff_90d = now - timedelta(days=90)

        stmt = delete(Notification).where(
            or_(
                Notification.expires_at < now,
                (Notification.is_dismissed.is_(True) & (Notification.dismissed_at < cutoff_90d)),
            )
        )
        res = await self.db.execute(stmt)
        await self.db.commit()
        return res.rowcount or 0

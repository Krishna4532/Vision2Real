from __future__ import annotations

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.roles import Roles
from app.models.admin_settings import AdminAuditLog, PlatformSettings
from app.models.auth import UserORM
from app.models.notification import CampaignDeliveryLog, MarketingCampaign, Notification, NotificationTemplate, PushSubscription


class AdminSettingsRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_platform_settings(self) -> PlatformSettings:
        result = await self.db.execute(select(PlatformSettings).limit(1))
        settings = result.scalar_one_or_none()
        if settings:
            return settings
        settings = PlatformSettings()
        self.db.add(settings)
        await self.db.commit()
        await self.db.refresh(settings)
        return settings

    async def list_admin_users(
        self, page: int, page_size: int, search: str | None, role: str | None, status_filter: str | None, provider: str | None
    ) -> tuple[list[UserORM], int]:
        filters = [UserORM.role.in_(Roles.ADMIN_ROLES)]
        if search:
            term = f"%{search.strip()}%"
            filters.append(or_(UserORM.full_name.ilike(term), UserORM.email.ilike(term)))
        if role:
            filters.append(UserORM.role == role)
        if status_filter:
            filters.append(UserORM.is_active == (status_filter.upper() == "ACTIVE"))
        if provider:
            filters.append(UserORM.auth_provider == provider)
        query = select(UserORM).where(*filters).order_by(UserORM.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
        count_query = select(func.count()).select_from(UserORM).where(*filters)
        users = list((await self.db.execute(query)).scalars().all())
        total = int((await self.db.execute(count_query)).scalar_one())
        return users, total

    async def get_admin_user(self, user_id: str) -> UserORM | None:
        result = await self.db.execute(select(UserORM).where(UserORM.id == user_id, UserORM.role.in_(Roles.ADMIN_ROLES)))
        return result.scalar_one_or_none()

    async def get_admin_user_by_email(self, email: str) -> UserORM | None:
        result = await self.db.execute(
            select(UserORM).where(UserORM.email == email.lower().strip(), UserORM.role.in_(Roles.ADMIN_ROLES))
        )
        return result.scalar_one_or_none()

    async def count_active_super_admins(self) -> int:
        result = await self.db.execute(
            select(func.count()).select_from(UserORM).where(UserORM.role == Roles.SUPER_ADMIN, UserORM.is_active.is_(True))
        )
        return int(result.scalar_one())

    async def list_audit_logs(
        self, page: int, page_size: int, search: str | None, action: str | None, result_filter: str | None
    ) -> tuple[list[AdminAuditLog], int]:
        filters = []
        if search:
            term = f"%{search.strip()}%"
            filters.append(or_(AdminAuditLog.admin_name.ilike(term), AdminAuditLog.action.ilike(term), AdminAuditLog.target_label.ilike(term), AdminAuditLog.ip_address.ilike(term)))
        if action:
            filters.append(AdminAuditLog.action == action)
        if result_filter:
            filters.append(AdminAuditLog.result == result_filter)
        query = select(AdminAuditLog).where(*filters).order_by(AdminAuditLog.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
        count_query = select(func.count()).select_from(AdminAuditLog).where(*filters)
        logs = list((await self.db.execute(query)).scalars().all())
        total = int((await self.db.execute(count_query)).scalar_one())
        return logs, total

    async def add_audit_log(self, log: AdminAuditLog) -> AdminAuditLog:
        self.db.add(log)
        await self.db.flush()
        return log

    async def get_notification_metrics(self) -> dict[str, int | float]:
        subscribers = int((await self.db.execute(select(func.count()).select_from(PushSubscription))).scalar_one())
        campaigns = int((await self.db.execute(select(func.count()).select_from(MarketingCampaign))).scalar_one())
        queued = int((await self.db.execute(select(func.count()).select_from(Notification).where(Notification.status == "QUEUED"))).scalar_one())
        scheduled = int((await self.db.execute(select(func.count()).select_from(MarketingCampaign).where(MarketingCampaign.status == "SCHEDULED"))).scalar_one())
        failed = int((await self.db.execute(select(func.count()).select_from(CampaignDeliveryLog).where(CampaignDeliveryLog.status == "FAILED"))).scalar_one())
        templates = int((await self.db.execute(select(func.count()).select_from(NotificationTemplate))).scalar_one())
        delivered = int((await self.db.execute(select(func.count()).select_from(CampaignDeliveryLog).where(CampaignDeliveryLog.status.in_(["DELIVERED", "SENT"])))).scalar_one())
        total_logs = int((await self.db.execute(select(func.count()).select_from(CampaignDeliveryLog))).scalar_one())
        return {
            "subscribers": subscribers,
            "campaigns": campaigns,
            "queued": queued,
            "scheduled": scheduled,
            "failed": failed,
            "templates": templates,
            "delivery_success_rate": round((delivered / total_logs) * 100, 2) if total_logs else 0.0,
        }

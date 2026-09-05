from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import List, Optional, Sequence, Tuple
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.auth import UserORM
from app.models.notification import (
    MarketingCampaign,
    CampaignDeliveryLog,
    NotificationTemplate,
    NotificationPreference,
    PushSubscription,
)
from app.models.validation import Validation
from app.models.reality_sprint import RealitySprint
from app.models.build_request import BuildRequest


class AdminCampaignRepository:
    """Persistence repository for Campaign & Notification Management in Admin HQ."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # ── Campaigns ─────────────────────────────────────────────────────────────

    async def list_campaigns(
        self,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        status: Optional[str] = None,
        audience: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> Tuple[Sequence[MarketingCampaign], int]:
        stmt = select(MarketingCampaign)

        if search and search.strip():
            term = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(
                    MarketingCampaign.name.ilike(term),
                    MarketingCampaign.title.ilike(term),
                    MarketingCampaign.body.ilike(term),
                )
            )

        if status and status.strip() and status.upper() != "ALL":
            stmt = stmt.where(MarketingCampaign.status == status.strip().upper())

        if audience and audience.strip() and audience.upper() != "ALL":
            stmt = stmt.where(MarketingCampaign.audience == audience.strip().upper())

        # Count total
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total: int = (await self.session.execute(count_stmt)).scalar_one() or 0

        # Sort
        sort_col = {
            "name": MarketingCampaign.name,
            "status": MarketingCampaign.status,
            "audience": MarketingCampaign.audience,
            "sent_at": MarketingCampaign.sent_at,
            "updated_at": MarketingCampaign.updated_at,
        }.get(sort_by, MarketingCampaign.created_at)

        if sort_order.lower() == "asc":
            stmt = stmt.order_by(sort_col.asc())
        else:
            stmt = stmt.order_by(sort_col.desc())

        # Paginate
        offset = (page - 1) * page_size
        stmt = stmt.offset(offset).limit(page_size)

        result = await self.session.execute(stmt)
        return result.scalars().all(), total

    async def get_campaign_by_id(self, campaign_id: str) -> Optional[MarketingCampaign]:
        stmt = select(MarketingCampaign).where(MarketingCampaign.id == campaign_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create_campaign(self, campaign: MarketingCampaign) -> MarketingCampaign:
        self.session.add(campaign)
        await self.session.commit()
        await self.session.refresh(campaign)
        return campaign

    async def update_campaign(self, campaign: MarketingCampaign) -> MarketingCampaign:
        self.session.add(campaign)
        await self.session.commit()
        await self.session.refresh(campaign)
        return campaign

    async def delete_campaign(self, campaign_id: str) -> bool:
        campaign = await self.get_campaign_by_id(campaign_id)
        if not campaign:
            return False
        await self.session.delete(campaign)
        await self.session.commit()
        return True

    # ── Delivery Logs & Analytics ──────────────────────────────────────────────

    async def create_delivery_logs(self, logs: List[CampaignDeliveryLog]) -> None:
        self.session.add_all(logs)
        await self.session.commit()

    async def list_delivery_logs(
        self,
        campaign_id: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        channel: Optional[str] = None,
    ) -> Tuple[Sequence[Tuple[CampaignDeliveryLog, UserORM]], int]:
        stmt = select(CampaignDeliveryLog, UserORM).join(
            UserORM, CampaignDeliveryLog.founder_id == UserORM.id, isouter=True
        )

        if campaign_id:
            stmt = stmt.where(CampaignDeliveryLog.campaign_id == campaign_id)

        if status and status.strip() and status.upper() != "ALL":
            stmt = stmt.where(CampaignDeliveryLog.status == status.strip().upper())

        if channel and channel.strip() and channel.upper() != "ALL":
            stmt = stmt.where(CampaignDeliveryLog.channel == channel.strip().upper())

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total: int = (await self.session.execute(count_stmt)).scalar_one() or 0

        stmt = stmt.order_by(CampaignDeliveryLog.created_at.desc())
        offset = (page - 1) * page_size
        stmt = stmt.offset(offset).limit(page_size)

        result = await self.session.execute(stmt)
        return result.all(), total

    async def get_campaign_analytics(self) -> dict:
        total_campaigns_stmt = select(func.count(MarketingCampaign.id))
        total_campaigns = (await self.session.execute(total_campaigns_stmt)).scalar_one() or 0

        stats_stmt = select(
            func.coalesce(func.sum(MarketingCampaign.stats_sent), 0),
            func.coalesce(func.sum(MarketingCampaign.stats_delivered), 0),
            func.coalesce(func.sum(MarketingCampaign.stats_failed), 0),
            func.coalesce(func.sum(MarketingCampaign.stats_read), 0),
            func.coalesce(func.sum(MarketingCampaign.stats_clicked), 0),
        )
        res = (await self.session.execute(stats_stmt)).one()
        total_sent, total_delivered, total_failed, total_read, total_clicked = res

        avg_delivery_rate = (total_delivered / total_sent * 100.0) if total_sent > 0 else 0.0
        avg_ctr = (total_clicked / total_delivered * 100.0) if total_delivered > 0 else 0.0

        return {
            "total_campaigns": total_campaigns,
            "total_sent": total_sent,
            "total_delivered": total_delivered,
            "total_failed": total_failed,
            "total_read": total_read,
            "total_clicked": total_clicked,
            "avg_delivery_rate": round(avg_delivery_rate, 2),
            "avg_ctr": round(avg_ctr, 2),
        }

    # ── Notification Templates ────────────────────────────────────────────────

    async def list_templates(self) -> Sequence[NotificationTemplate]:
        stmt = select(NotificationTemplate).order_by(NotificationTemplate.created_at.desc())
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_template_by_id(self, template_id: str) -> Optional[NotificationTemplate]:
        stmt = select(NotificationTemplate).where(NotificationTemplate.id == template_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create_template(self, template: NotificationTemplate) -> NotificationTemplate:
        self.session.add(template)
        await self.session.commit()
        await self.session.refresh(template)
        return template

    async def update_template(self, template: NotificationTemplate) -> NotificationTemplate:
        self.session.add(template)
        await self.session.commit()
        await self.session.refresh(template)
        return template

    async def delete_template(self, template_id: str) -> bool:
        tmpl = await self.get_template_by_id(template_id)
        if not tmpl:
            return False
        await self.session.delete(tmpl)
        await self.session.commit()
        return True

    # ── Push Subscribers & Preferences ─────────────────────────────────────────

    async def list_push_subscribers(
        self,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
    ) -> Tuple[Sequence[Tuple[PushSubscription, UserORM]], int]:
        stmt = select(PushSubscription, UserORM).join(
            UserORM, PushSubscription.founder_id == UserORM.id, isouter=True
        )

        if search and search.strip():
            term = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(
                    UserORM.full_name.ilike(term),
                    UserORM.email.ilike(term),
                    PushSubscription.user_agent.ilike(term),
                )
            )

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total: int = (await self.session.execute(count_stmt)).scalar_one() or 0

        stmt = stmt.order_by(PushSubscription.created_at.desc())
        offset = (page - 1) * page_size
        stmt = stmt.offset(offset).limit(page_size)

        result = await self.session.execute(stmt)
        return result.all(), total

    async def list_founder_preferences(
        self,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
    ) -> Tuple[Sequence[Tuple[NotificationPreference, UserORM]], int]:
        stmt = select(NotificationPreference, UserORM).join(
            UserORM, NotificationPreference.founder_id == UserORM.id, isouter=True
        )

        if search and search.strip():
            term = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(
                    UserORM.full_name.ilike(term),
                    UserORM.email.ilike(term),
                )
            )

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total: int = (await self.session.execute(count_stmt)).scalar_one() or 0

        stmt = stmt.order_by(NotificationPreference.updated_at.desc())
        offset = (page - 1) * page_size
        stmt = stmt.offset(offset).limit(page_size)

        result = await self.session.execute(stmt)
        return result.all(), total

    # ── Audience Resolution Engine ─────────────────────────────────────────────

    async def get_target_founders(
        self,
        audience: str,
        target_founder_ids: Optional[List[str]] = None,
    ) -> Sequence[UserORM]:
        now = datetime.now(timezone.utc)

        if audience in ("SPECIFIC_FOUNDER", "MULTIPLE_FOUNDERS") and target_founder_ids:
            stmt = select(UserORM).where(UserORM.id.in_(target_founder_ids))
            res = await self.session.execute(stmt)
            return res.scalars().all()

        if audience == "JOINED_THIS_WEEK":
            seven_days_ago = now - timedelta(days=7)
            stmt = select(UserORM).where(UserORM.created_at >= seven_days_ago)
            res = await self.session.execute(stmt)
            return res.scalars().all()

        if audience == "JOINED_THIS_MONTH":
            thirty_days_ago = now - timedelta(days=30)
            stmt = select(UserORM).where(UserORM.created_at >= thirty_days_ago)
            res = await self.session.execute(stmt)
            return res.scalars().all()

        if audience == "VALIDATED_FOUNDERS":
            stmt = select(UserORM).join(Validation, UserORM.id == Validation.founder_id).distinct()
            res = await self.session.execute(stmt)
            return res.scalars().all()

        if audience == "SPRINT_FOUNDERS":
            stmt = select(UserORM).join(RealitySprint, UserORM.id == RealitySprint.founder_id).distinct()
            res = await self.session.execute(stmt)
            return res.scalars().all()

        if audience == "BUILD_FOUNDERS":
            stmt = select(UserORM).join(BuildRequest, UserORM.id == BuildRequest.founder_id).distinct()
            res = await self.session.execute(stmt)
            return res.scalars().all()

        if audience == "ACTIVE_FOUNDERS":
            # Founders with any active validation, sprint, or build request
            validation_sub = select(Validation.founder_id)
            sprint_sub = select(RealitySprint.founder_id)
            build_sub = select(BuildRequest.founder_id)
            stmt = select(UserORM).where(
                or_(
                    UserORM.id.in_(validation_sub),
                    UserORM.id.in_(sprint_sub),
                    UserORM.id.in_(build_sub),
                )
            )
            res = await self.session.execute(stmt)
            return res.scalars().all()

        if audience == "INACTIVE_FOUNDERS":
            # Founders without active validation, sprint, or build request
            active_ids_stmt = select(UserORM.id).where(
                or_(
                    UserORM.id.in_(select(Validation.founder_id)),
                    UserORM.id.in_(select(RealitySprint.founder_id)),
                    UserORM.id.in_(select(BuildRequest.founder_id)),
                )
            )
            res_active = await self.session.execute(active_ids_stmt)
            active_ids = set(res_active.scalars().all())
            stmt = select(UserORM).where(UserORM.id.not_in(active_ids) if active_ids else True)
            res = await self.session.execute(stmt)
            return res.scalars().all()

        # Default ALL_FOUNDERS
        stmt = select(UserORM)
        res = await self.session.execute(stmt)
        return res.scalars().all()

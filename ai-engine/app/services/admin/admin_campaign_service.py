from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Sequence, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import UserORM
from app.models.notification import MarketingCampaign, CampaignDeliveryLog, NotificationTemplate
from app.repositories.admin.admin_campaign_repository import AdminCampaignRepository
from app.services.notification_service import NotificationService
from app.schemas.admin_campaigns import (
    CampaignCreate,
    CampaignUpdate,
    NotificationTemplateCreate,
    NotificationTemplateUpdate,
)
from app.schemas.notification import NotificationCategory, NotificationPriority, NotificationType

logger = logging.getLogger(__name__)


def interpolate_variables(text: str, founder: UserORM, extra_vars: Optional[Dict[str, str]] = None) -> str:
    """Replaces handlebars-style variables like {{founder_name}}, {{email}}, etc. with real founder data."""
    if not text:
        return text

    replacements = {
        "{{founder_name}}": founder.full_name or "Founder",
        "{{founder_email}}": founder.email or "",
        "{{email}}": founder.email or "",
        "{{role}}": getattr(founder, "role", "FOUNDER"),
        "{{founder_stage}}": getattr(founder, "founder_stage", "IDEA_STAGE"),
    }

    if extra_vars:
        for k, v in extra_vars.items():
            key_tag = f"{{{{{k}}}}}"
            replacements[key_tag] = str(v)

    res = text
    for tag, val in replacements.items():
        res = res.replace(tag, val)
    return res


class AdminCampaignService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = AdminCampaignRepository(db)
        self.notification_service = NotificationService(db)

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
        return await self.repo.list_campaigns(
            page=page,
            page_size=page_size,
            search=search,
            status=status,
            audience=audience,
            sort_by=sort_by,
            sort_order=sort_order,
        )

    async def get_campaign_by_id(self, campaign_id: str) -> Optional[MarketingCampaign]:
        return await self.repo.get_campaign_by_id(campaign_id)

    async def create_campaign(self, data: CampaignCreate, created_by_id: Optional[str] = None) -> MarketingCampaign:
        channels_str = [c.value if hasattr(c, "value") else str(c) for c in data.channels]
        campaign = MarketingCampaign(
            name=data.name,
            description=data.description,
            audience=data.audience.value if hasattr(data.audience, "value") else str(data.audience),
            target_founder_ids=data.target_founder_ids,
            channels=channels_str,
            title=data.title,
            body=data.body,
            deep_link=data.deep_link,
            action_label=data.action_label,
            status="DRAFT",
            scheduled_at=data.scheduled_at,
            created_by=created_by_id,
            extra_metadata=data.extra_metadata,
        )
        return await self.repo.create_campaign(campaign)

    async def update_campaign(self, campaign_id: str, data: CampaignUpdate) -> Optional[MarketingCampaign]:
        campaign = await self.repo.get_campaign_by_id(campaign_id)
        if not campaign:
            return None

        if campaign.status in ("SENDING", "SENT"):
            raise ValueError(f"Cannot edit campaign in {campaign.status} status")

        if data.name is not None:
            campaign.name = data.name
        if data.description is not None:
            campaign.description = data.description
        if data.audience is not None:
            campaign.audience = data.audience.value if hasattr(data.audience, "value") else str(data.audience)
        if data.target_founder_ids is not None:
            campaign.target_founder_ids = data.target_founder_ids
        if data.channels is not None:
            campaign.channels = [c.value if hasattr(c, "value") else str(c) for c in data.channels]
        if data.title is not None:
            campaign.title = data.title
        if data.body is not None:
            campaign.body = data.body
        if data.deep_link is not None:
            campaign.deep_link = data.deep_link
        if data.action_label is not None:
            campaign.action_label = data.action_label
        if data.scheduled_at is not None:
            campaign.scheduled_at = data.scheduled_at
        if data.extra_metadata is not None:
            campaign.extra_metadata = data.extra_metadata

        return await self.repo.update_campaign(campaign)

    async def delete_campaign(self, campaign_id: str) -> bool:
        return await self.repo.delete_campaign(campaign_id)

    async def send_campaign(self, campaign_id: str) -> MarketingCampaign:
        campaign = await self.repo.get_campaign_by_id(campaign_id)
        if not campaign:
            raise ValueError("Campaign not found")

        if campaign.status in ("SENDING", "SENT"):
            raise ValueError(f"Campaign has already been sent or is currently sending")

        campaign.status = "SENDING"
        await self.repo.update_campaign(campaign)

        target_founders = await self.repo.get_target_founders(
            audience=campaign.audience,
            target_founder_ids=campaign.target_founder_ids,
        )

        sent_count = 0
        delivered_count = 0
        failed_count = 0
        delivery_logs: List[CampaignDeliveryLog] = []

        now = datetime.now(timezone.utc)

        for founder in target_founders:
            rendered_title = interpolate_variables(campaign.title, founder)
            rendered_body = interpolate_variables(campaign.body, founder)

            # In-App delivery
            if "IN_APP" in campaign.channels:
                try:
                    notif = await self.notification_service.publish(
                        founder_id=founder.id,
                        notification_type=NotificationType.MARKETING_CAMPAIGN,
                        category=NotificationCategory.MARKETING,
                        title=rendered_title,
                        body=rendered_body,
                        deep_link=campaign.deep_link,
                        action_label=campaign.action_label,
                        priority=NotificationPriority.NORMAL,
                        source_module="marketing_campaign",
                        source_record_id=campaign.id,
                        extra_metadata={"campaign_id": campaign.id, "campaign_name": campaign.name},
                    )
                    sent_count += 1
                    if notif:
                        delivered_count += 1
                        delivery_logs.append(
                            CampaignDeliveryLog(
                                campaign_id=campaign.id,
                                founder_id=founder.id,
                                channel="IN_APP",
                                status="DELIVERED",
                                delivered_at=now,
                            )
                        )
                    else:
                        failed_count += 1
                        delivery_logs.append(
                            CampaignDeliveryLog(
                                campaign_id=campaign.id,
                                founder_id=founder.id,
                                channel="IN_APP",
                                status="FAILED",
                                error_message="Suppressed by founder notification preferences",
                            )
                        )
                except Exception as err:
                    failed_count += 1
                    logger.error(f"Failed campaign IN_APP delivery to {founder.id}: {err}")
                    delivery_logs.append(
                        CampaignDeliveryLog(
                            campaign_id=campaign.id,
                            founder_id=founder.id,
                            channel="IN_APP",
                            status="FAILED",
                            error_message=str(err),
                        )
                    )

            # Browser Push delivery log tracking
            if "BROWSER_PUSH" in campaign.channels and "IN_APP" not in campaign.channels:
                sent_count += 1
                delivered_count += 1
                delivery_logs.append(
                    CampaignDeliveryLog(
                        campaign_id=campaign.id,
                        founder_id=founder.id,
                        channel="BROWSER_PUSH",
                        status="DELIVERED",
                        delivered_at=now,
                    )
                )

        if delivery_logs:
            await self.repo.create_delivery_logs(delivery_logs)

        campaign.status = "SENT"
        campaign.sent_at = now
        campaign.stats_sent += sent_count
        campaign.stats_delivered += delivered_count
        campaign.stats_failed += failed_count

        return await self.repo.update_campaign(campaign)

    async def test_send_campaign(
        self, campaign_id: str, target_founder_id: str, preview_variables: Dict[str, str]
    ) -> bool:
        campaign = await self.repo.get_campaign_by_id(campaign_id)
        if not campaign:
            raise ValueError("Campaign not found")

        stmt = await self.db.execute(
            select(UserORM).where(UserORM.id == target_founder_id)
        )
        founder = stmt.scalar_one_or_none()
        if not founder:
            raise ValueError("Target founder not found for test send")

        rendered_title = interpolate_variables(campaign.title, founder, preview_variables)
        rendered_body = interpolate_variables(campaign.body, founder, preview_variables)

        notif = await self.notification_service.publish(
            founder_id=founder.id,
            notification_type=NotificationType.MARKETING_CAMPAIGN,
            category=NotificationCategory.MARKETING,
            title=f"[TEST] {rendered_title}",
            body=rendered_body,
            deep_link=campaign.deep_link,
            action_label=campaign.action_label,
            priority=NotificationPriority.NORMAL,
            source_module="marketing_campaign_test",
            source_record_id=campaign.id,
            extra_metadata={"is_test": True, "campaign_id": campaign.id},
        )
        return notif is not None

    # ── Delivery Logs & Analytics ──────────────────────────────────────────────

    async def list_delivery_logs(
        self,
        campaign_id: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        channel: Optional[str] = None,
    ) -> Tuple[Sequence[Tuple[CampaignDeliveryLog, UserORM]], int]:
        return await self.repo.list_delivery_logs(
            campaign_id=campaign_id,
            page=page,
            page_size=page_size,
            status=status,
            channel=channel,
        )

    async def get_analytics(self) -> dict:
        return await self.repo.get_campaign_analytics()

    # ── Templates ─────────────────────────────────────────────────────────────

    async def list_templates(self) -> Sequence[NotificationTemplate]:
        return await self.repo.list_templates()

    async def create_template(self, data: NotificationTemplateCreate) -> NotificationTemplate:
        default_channels = [c.value if hasattr(c, "value") else str(c) for c in data.default_channels]
        tmpl = NotificationTemplate(
            name=data.name,
            category=data.category,
            subject=data.subject,
            body=data.body,
            deep_link=data.deep_link,
            action_label=data.action_label,
            default_channels=default_channels,
            variables=data.variables,
        )
        return await self.repo.create_template(tmpl)

    async def update_template(self, template_id: str, data: NotificationTemplateUpdate) -> Optional[NotificationTemplate]:
        tmpl = await self.repo.get_template_by_id(template_id)
        if not tmpl:
            return None

        if data.name is not None:
            tmpl.name = data.name
        if data.category is not None:
            tmpl.category = data.category
        if data.subject is not None:
            tmpl.subject = data.subject
        if data.body is not None:
            tmpl.body = data.body
        if data.deep_link is not None:
            tmpl.deep_link = data.deep_link
        if data.action_label is not None:
            tmpl.action_label = data.action_label
        if data.default_channels is not None:
            tmpl.default_channels = [c.value if hasattr(c, "value") else str(c) for c in data.default_channels]
        if data.variables is not None:
            tmpl.variables = data.variables

        return await self.repo.update_template(tmpl)

    async def delete_template(self, template_id: str) -> bool:
        return await self.repo.delete_template(template_id)

    # ── Push Subscribers & Preferences ─────────────────────────────────────────

    async def list_push_subscribers(
        self, page: int = 1, page_size: int = 20, search: Optional[str] = None
    ) -> Tuple[Sequence[Tuple[Any, UserORM]], int]:
        return await self.repo.list_push_subscribers(page=page, page_size=page_size, search=search)

    async def list_founder_preferences(
        self, page: int = 1, page_size: int = 20, search: Optional[str] = None
    ) -> Tuple[Sequence[Tuple[Any, UserORM]], int]:
        return await self.repo.list_founder_preferences(page=page, page_size=page_size, search=search)

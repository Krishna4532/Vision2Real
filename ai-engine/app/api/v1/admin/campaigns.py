from __future__ import annotations

import math
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.auth.dependencies import require_admin
from app.models.auth import UserORM
from app.schemas.admin_campaigns import (
    CampaignAnalytics,
    CampaignCreate,
    CampaignDeliveryLogListResponse,
    CampaignDeliveryLogResponse,
    CampaignListResponse,
    CampaignResponse,
    CampaignTestSendRequest,
    CampaignUpdate,
    FounderPreferenceAdminListResponse,
    FounderPreferenceAdminView,
    NotificationTemplateCreate,
    NotificationTemplateResponse,
    NotificationTemplateUpdate,
    PushSubscriberListResponse,
    PushSubscriberResponse,
)
from app.services.admin.admin_campaign_service import AdminCampaignService

router = APIRouter()


# ── Analytics & Overview ──────────────────────────────────────────────────────

@router.get("/campaigns/analytics", response_model=CampaignAnalytics)
async def get_campaign_analytics(
    db: AsyncSession = Depends(get_db),
    _: UserORM = Depends(require_admin),
) -> CampaignAnalytics:
    """Get aggregated metrics and performance analytics across all marketing campaigns."""
    service = AdminCampaignService(db)
    stats = await service.get_analytics()
    return CampaignAnalytics(**stats)


# ── Campaigns CRUD & Delivery ─────────────────────────────────────────────────

@router.get("/campaigns", response_model=CampaignListResponse)
async def list_campaigns(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    audience: Optional[str] = Query(default=None),
    sort_by: str = Query(default="created_at"),
    sort_order: str = Query(default="desc"),
    db: AsyncSession = Depends(get_db),
    _: UserORM = Depends(require_admin),
) -> CampaignListResponse:
    """List all marketing campaigns with search, status filtering, and pagination."""
    service = AdminCampaignService(db)
    campaigns, total = await service.list_campaigns(
        page=page,
        page_size=page_size,
        search=search,
        status=status_filter,
        audience=audience,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    total_pages = math.ceil(total / page_size) if page_size > 0 else 1
    items = [CampaignResponse.model_validate(c) for c in campaigns]
    return CampaignListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("/campaigns", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    payload: CampaignCreate,
    db: AsyncSession = Depends(get_db),
    admin: UserORM = Depends(require_admin),
) -> CampaignResponse:
    """Create a new campaign draft or scheduled campaign."""
    service = AdminCampaignService(db)
    campaign = await service.create_campaign(payload, created_by_id=admin.id)
    return CampaignResponse.model_validate(campaign)


@router.get("/campaigns/{campaign_id}", response_model=CampaignResponse)
async def get_campaign_detail(
    campaign_id: str,
    db: AsyncSession = Depends(get_db),
    _: UserORM = Depends(require_admin),
) -> CampaignResponse:
    """Retrieve campaign details by ID."""
    service = AdminCampaignService(db)
    campaign = await service.get_campaign_by_id(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return CampaignResponse.model_validate(campaign)


@router.patch("/campaigns/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    campaign_id: str,
    payload: CampaignUpdate,
    db: AsyncSession = Depends(get_db),
    _: UserORM = Depends(require_admin),
) -> CampaignResponse:
    """Update a campaign draft or schedule."""
    service = AdminCampaignService(db)
    try:
        updated = await service.update_campaign(campaign_id, payload)
        if not updated:
            raise HTTPException(status_code=404, detail="Campaign not found")
        return CampaignResponse.model_validate(updated)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))


@router.delete("/campaigns/{campaign_id}")
async def delete_campaign(
    campaign_id: str,
    db: AsyncSession = Depends(get_db),
    _: UserORM = Depends(require_admin),
):
    """Delete a campaign."""
    service = AdminCampaignService(db)
    success = await service.delete_campaign(campaign_id)
    if not success:
        raise HTTPException(status_code=404, detail="Campaign not found")
    from fastapi.responses import Response
    return Response(status_code=204)


@router.post("/campaigns/{campaign_id}/send", response_model=CampaignResponse)
async def send_campaign(
    campaign_id: str,
    db: AsyncSession = Depends(get_db),
    _: UserORM = Depends(require_admin),
) -> CampaignResponse:
    """Trigger real-time campaign dispatch to targeted audience."""
    service = AdminCampaignService(db)
    try:
        sent_campaign = await service.send_campaign(campaign_id)
        return CampaignResponse.model_validate(sent_campaign)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))


@router.post("/campaigns/{campaign_id}/test")
async def test_send_campaign(
    campaign_id: str,
    payload: CampaignTestSendRequest,
    db: AsyncSession = Depends(get_db),
    _: UserORM = Depends(require_admin),
):
    """Send a test preview notification to a specific founder."""
    service = AdminCampaignService(db)
    try:
        success = await service.test_send_campaign(
            campaign_id=campaign_id,
            target_founder_id=payload.target_founder_id,
            preview_variables=payload.preview_variables,
        )
        return {"success": success, "message": "Test notification dispatched"}
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))


# ── Delivery Logs ─────────────────────────────────────────────────────────────

@router.get("/campaigns/delivery-logs/list", response_model=CampaignDeliveryLogListResponse)
async def list_delivery_logs(
    campaign_id: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    channel: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: UserORM = Depends(require_admin),
) -> CampaignDeliveryLogListResponse:
    """List real-time campaign delivery audit logs."""
    service = AdminCampaignService(db)
    logs, total = await service.list_delivery_logs(
        campaign_id=campaign_id,
        page=page,
        page_size=page_size,
        status=status_filter,
        channel=channel,
    )
    total_pages = math.ceil(total / page_size) if page_size > 0 else 1
    items = []
    for log, founder in logs:
        items.append(
            CampaignDeliveryLogResponse(
                id=log.id,
                campaign_id=log.campaign_id,
                founder_id=log.founder_id,
                founder_name=founder.full_name if founder else None,
                founder_email=founder.email if founder else None,
                channel=log.channel,
                status=log.status,
                error_message=log.error_message,
                delivered_at=log.delivered_at,
                read_at=log.read_at,
                clicked_at=log.clicked_at,
                created_at=log.created_at,
            )
        )
    return CampaignDeliveryLogListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


# ── Templates ─────────────────────────────────────────────────────────────────

@router.get("/campaigns/templates/list", response_model=list[NotificationTemplateResponse])
async def list_templates(
    db: AsyncSession = Depends(get_db),
    _: UserORM = Depends(require_admin),
) -> list[NotificationTemplateResponse]:
    """List all reusable notification templates."""
    service = AdminCampaignService(db)
    templates = await service.list_templates()
    return [NotificationTemplateResponse.model_validate(t) for t in templates]


@router.post("/campaigns/templates/create", response_model=NotificationTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    payload: NotificationTemplateCreate,
    db: AsyncSession = Depends(get_db),
    _: UserORM = Depends(require_admin),
) -> NotificationTemplateResponse:
    """Create a new reusable notification template."""
    service = AdminCampaignService(db)
    tmpl = await service.create_template(payload)
    return NotificationTemplateResponse.model_validate(tmpl)


@router.patch("/campaigns/templates/{template_id}", response_model=NotificationTemplateResponse)
async def update_template(
    template_id: str,
    payload: NotificationTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    _: UserORM = Depends(require_admin),
) -> NotificationTemplateResponse:
    """Update an existing notification template."""
    service = AdminCampaignService(db)
    updated = await service.update_template(template_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Template not found")
    return NotificationTemplateResponse.model_validate(updated)


@router.delete("/campaigns/templates/{template_id}")
async def delete_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    _: UserORM = Depends(require_admin),
):
    """Delete a notification template."""
    service = AdminCampaignService(db)
    success = await service.delete_template(template_id)
    if not success:
        raise HTTPException(status_code=404, detail="Template not found")
    from fastapi.responses import Response
    return Response(status_code=204)


# ── Push Subscribers ──────────────────────────────────────────────────────────

@router.get("/campaigns/subscribers/list", response_model=PushSubscriberListResponse)
async def list_push_subscribers(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: UserORM = Depends(require_admin),
) -> PushSubscriberListResponse:
    """List active browser Web Push subscribers across the platform."""
    service = AdminCampaignService(db)
    subs, total = await service.list_push_subscribers(page=page, page_size=page_size, search=search)
    total_pages = math.ceil(total / page_size) if page_size > 0 else 1
    items = []
    for sub, founder in subs:
        items.append(
            PushSubscriberResponse(
                id=sub.id,
                founder_id=sub.founder_id,
                founder_name=founder.full_name if founder else None,
                founder_email=founder.email if founder else None,
                endpoint=sub.endpoint,
                user_agent=sub.user_agent,
                created_at=sub.created_at,
                last_used_at=sub.last_used_at,
            )
        )
    return PushSubscriberListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


# ── Founder Notification Preferences (Read-Only) ──────────────────────────────

@router.get("/campaigns/founder-preferences/list", response_model=FounderPreferenceAdminListResponse)
async def list_founder_preferences(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: UserORM = Depends(require_admin),
) -> FounderPreferenceAdminListResponse:
    """View read-only list of founder notification preferences & quiet hours."""
    service = AdminCampaignService(db)
    prefs, total = await service.list_founder_preferences(page=page, page_size=page_size, search=search)
    total_pages = math.ceil(total / page_size) if page_size > 0 else 1
    items = []
    for pref, founder in prefs:
        items.append(
            FounderPreferenceAdminView(
                founder_id=pref.founder_id,
                founder_name=founder.full_name if founder else None,
                founder_email=founder.email if founder else None,
                browser_push_enabled=pref.browser_push_enabled,
                email_enabled=pref.email_enabled,
                validation_notifications=pref.validation_notifications,
                sprint_notifications=pref.sprint_notifications,
                build_notifications=pref.build_notifications,
                marketing_notifications=pref.marketing_notifications,
                system_notifications=pref.system_notifications,
                quiet_hours_enabled=pref.quiet_hours_enabled,
                quiet_hours_start=pref.quiet_hours_start,
                quiet_hours_end=pref.quiet_hours_end,
                notification_frequency=getattr(pref, "notification_frequency", "INSTANT"),
                updated_at=pref.updated_at,
            )
        )
    return FounderPreferenceAdminListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )

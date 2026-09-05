from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.auth.dependencies import require_authenticated_user
from app.models.auth import UserORM
from app.models.notification import PushSubscription
from app.repositories.notification_repository import NotificationRepository
from app.schemas.notification import (
    NotificationAnalytics,
    NotificationListResponse,
    NotificationPreferenceResponse,
    NotificationPreferenceUpdate,
    NotificationResponse,
    PushSubscriptionCreate,
    PushSubscriptionResponse,
    TestNotificationRequest,
    UnreadCountResponse,
)
from app.services.notification_service import NotificationService, DEFAULT_VAPID_PUBLIC_KEY

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    category: Optional[str] = Query(None, description="Filter by category (VALIDATION, REALITY_SPRINT, BUILD_REQUEST, MARKETING, SYSTEM)"),
    is_read: Optional[bool] = Query(None, description="Filter by read state"),
    search: Optional[str] = Query(None, description="Search term in title or body"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: UserORM = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    repo = NotificationRepository(db)
    items, unread_count, total = await repo.list_notifications(
        founder_id=current_user.id,
        category=category,
        is_read=is_read,
        search=search,
        page=page,
        page_size=page_size,
    )
    total_pages = max(1, (total + page_size - 1) // page_size)

    return NotificationListResponse(
        items=[NotificationResponse.model_validate(n) for n in items],
        unread_count=unread_count,
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    current_user: UserORM = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    repo = NotificationRepository(db)
    count = await repo.get_unread_count(current_user.id)
    return UnreadCountResponse(unread_count=count)


@router.get("/analytics", response_model=NotificationAnalytics)
async def get_notification_analytics(
    current_user: UserORM = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    repo = NotificationRepository(db)
    stats = await repo.get_analytics(current_user.id)
    return NotificationAnalytics(**stats)


@router.get("/vapid-public-key")
async def get_vapid_public_key(
    current_user: UserORM = Depends(require_authenticated_user),
):
    return {"public_key": DEFAULT_VAPID_PUBLIC_KEY}


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_as_read(
    notification_id: str,
    current_user: UserORM = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    repo = NotificationRepository(db)
    notification = await repo.mark_as_read(notification_id, current_user.id)
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )
    return NotificationResponse.model_validate(notification)


@router.patch("/read-all")
async def mark_all_notifications_as_read(
    current_user: UserORM = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    repo = NotificationRepository(db)
    count = await repo.mark_all_as_read(current_user.id)
    return {"status": "ok", "marked_read_count": count}


@router.delete("/read")
async def delete_read_notifications(
    current_user: UserORM = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    repo = NotificationRepository(db)
    count = await repo.delete_read_notifications(current_user.id)
    return {"status": "ok", "deleted_count": count}


@router.delete("/{notification_id}")
async def dismiss_notification(
    notification_id: str,
    current_user: UserORM = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    repo = NotificationRepository(db)
    success = await repo.dismiss_notification(notification_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )
    return {"status": "ok", "dismissed_id": notification_id}


# ── Preferences ──────────────────────────────────────────────────────────────

@router.get("/preferences", response_model=NotificationPreferenceResponse)
async def get_preferences(
    current_user: UserORM = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    repo = NotificationRepository(db)
    pref = await repo.get_or_create_preferences(current_user.id)
    return NotificationPreferenceResponse.model_validate(pref)


@router.patch("/preferences", response_model=NotificationPreferenceResponse)
async def update_preferences(
    payload: NotificationPreferenceUpdate,
    current_user: UserORM = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    repo = NotificationRepository(db)
    updates = payload.model_dump(exclude_unset=True)
    pref = await repo.update_preferences(current_user.id, updates)
    return NotificationPreferenceResponse.model_validate(pref)


# ── Subscriptions & Test Notification ─────────────────────────────────────────

@router.post("/subscriptions", response_model=PushSubscriptionResponse)
async def create_push_subscription(
    payload: PushSubscriptionCreate,
    current_user: UserORM = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    repo = NotificationRepository(db)
    sub = PushSubscription(
        founder_id=current_user.id,
        endpoint=payload.endpoint,
        p256dh_key=payload.p256dh_key,
        auth_key=payload.auth_key,
        user_agent=payload.user_agent,
    )
    saved = await repo.save_push_subscription(sub)
    return PushSubscriptionResponse.model_validate(saved)


@router.delete("/subscriptions")
async def delete_push_subscription(
    endpoint: str = Query(..., description="Target push endpoint to unregister"),
    current_user: UserORM = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    repo = NotificationRepository(db)
    success = await repo.delete_push_subscription(current_user.id, endpoint)
    return {"status": "ok", "deleted": success}


@router.post("/test-notification", response_model=NotificationResponse)
async def send_test_notification(
    payload: Optional[TestNotificationRequest] = None,
    current_user: UserORM = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    service = NotificationService(db)
    title = payload.title if payload and payload.title else "Vision2Real Test Notification"
    body = payload.body if payload and payload.body else "Web Push & Notification Center integration active."

    notification = await service.publish(
        founder_id=current_user.id,
        notification_type="SYSTEM",
        category="SYSTEM",
        title=title,
        body=body,
        deep_link="/founder/notifications",
        action_label="View Center",
        priority="NORMAL",
        source_module="settings",
    )
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to publish test notification",
        )
    return NotificationResponse.model_validate(notification)

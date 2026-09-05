from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class NotificationType(str, Enum):
    WELCOME = "WELCOME"
    VALIDATION_STARTED = "VALIDATION_STARTED"
    VALIDATION_COMPLETED = "VALIDATION_COMPLETED"
    REALITY_SPRINT_SUBMITTED = "REALITY_SPRINT_SUBMITTED"
    REALITY_SPRINT_ACCEPTED = "REALITY_SPRINT_ACCEPTED"
    REALITY_SPRINT_COMPLETED = "REALITY_SPRINT_COMPLETED"
    BUILD_REQUEST_CREATED = "BUILD_REQUEST_CREATED"
    BUILD_PHASE_UPDATED = "BUILD_PHASE_UPDATED"
    BUILD_PROGRESS_UPDATED = "BUILD_PROGRESS_UPDATED"
    BUILD_MESSAGE_RECEIVED = "BUILD_MESSAGE_RECEIVED"
    BUILD_COMPLETED = "BUILD_COMPLETED"
    MARKETING_CAMPAIGN = "MARKETING_CAMPAIGN"
    SYSTEM = "SYSTEM"


class NotificationCategory(str, Enum):
    VALIDATION = "VALIDATION"
    REALITY_SPRINT = "REALITY_SPRINT"
    BUILD_REQUEST = "BUILD_REQUEST"
    MARKETING = "MARKETING"
    SYSTEM = "SYSTEM"


class NotificationPriority(str, Enum):
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"


class NotificationStatus(str, Enum):
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"


class NotificationFrequency(str, Enum):
    INSTANT = "INSTANT"
    DAILY_DIGEST = "DAILY_DIGEST"
    WEEKLY_DIGEST = "WEEKLY_DIGEST"


# ── Notification Response Schemas ─────────────────────────────────────────────

class NotificationResponse(BaseModel):
    id: str
    founder_id: str
    notification_type: str
    category: str
    title: str
    body: str
    deep_link: str
    action_label: str
    priority: str
    status: str
    source_module: Optional[str] = None
    source_record_id: Optional[str] = None
    is_read: bool
    read_at: Optional[datetime] = None
    is_dismissed: bool
    dismissed_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    extra_metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    items: List[NotificationResponse]
    unread_count: int
    page: int
    page_size: int
    total: int
    total_pages: int


class UnreadCountResponse(BaseModel):
    unread_count: int


# ── Preference Schemas ───────────────────────────────────────────────────────

class NotificationPreferenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    founder_id: str
    browser_push_enabled: bool
    email_enabled: bool
    validation_notifications: bool
    sprint_notifications: bool
    build_notifications: bool
    marketing_notifications: bool
    system_notifications: bool
    quiet_hours_enabled: bool
    quiet_hours_start: str
    quiet_hours_end: str
    notification_frequency: str
    updated_at: datetime


class NotificationPreferenceUpdate(BaseModel):
    browser_push_enabled: Optional[bool] = None
    email_enabled: Optional[bool] = None
    validation_notifications: Optional[bool] = None
    sprint_notifications: Optional[bool] = None
    build_notifications: Optional[bool] = None
    marketing_notifications: Optional[bool] = None
    system_notifications: Optional[bool] = None
    quiet_hours_enabled: Optional[bool] = None
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None
    notification_frequency: Optional[str] = None


# ── Push Subscription Schemas ─────────────────────────────────────────────────

class PushSubscriptionCreate(BaseModel):
    endpoint: str
    p256dh_key: str
    auth_key: str
    user_agent: Optional[str] = None


class PushSubscriptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    founder_id: str
    endpoint: str
    created_at: datetime
    last_used_at: Optional[datetime] = None


# ── Analytics & Test Notification ────────────────────────────────────────────

class CategoryBreakdown(BaseModel):
    category: str
    total: int
    unread: int


class NotificationAnalytics(BaseModel):
    total_count: int
    unread_count: int
    read_rate: float
    category_breakdown: List[CategoryBreakdown]


class TestNotificationRequest(BaseModel):
    title: Optional[str] = "Vision2Real Test Notification"
    body: Optional[str] = "Web Push notifications are active and connected."

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class CampaignAudience(str, Enum):
    ALL_FOUNDERS = "ALL_FOUNDERS"
    ACTIVE_FOUNDERS = "ACTIVE_FOUNDERS"
    INACTIVE_FOUNDERS = "INACTIVE_FOUNDERS"
    JOINED_THIS_WEEK = "JOINED_THIS_WEEK"
    JOINED_THIS_MONTH = "JOINED_THIS_MONTH"
    BUILD_FOUNDERS = "BUILD_FOUNDERS"
    SPRINT_FOUNDERS = "SPRINT_FOUNDERS"
    VALIDATED_FOUNDERS = "VALIDATED_FOUNDERS"
    SPECIFIC_FOUNDER = "SPECIFIC_FOUNDER"
    MULTIPLE_FOUNDERS = "MULTIPLE_FOUNDERS"


class CampaignChannel(str, Enum):
    IN_APP = "IN_APP"
    BROWSER_PUSH = "BROWSER_PUSH"


class CampaignStatus(str, Enum):
    DRAFT = "DRAFT"
    SCHEDULED = "SCHEDULED"
    SENDING = "SENDING"
    SENT = "SENT"
    CANCELLED = "CANCELLED"
    FAILED = "FAILED"


# ── Campaign Request & Response Schemas ────────────────────────────────────────

class CampaignCreate(BaseModel):
    name: str = Field(..., max_length=255)
    description: Optional[str] = None
    audience: CampaignAudience = CampaignAudience.ALL_FOUNDERS
    target_founder_ids: Optional[List[str]] = None
    channels: List[CampaignChannel] = Field(default_factory=lambda: [CampaignChannel.IN_APP])
    title: str = Field(..., max_length=255)
    body: str
    deep_link: str = Field(default="/founder/dashboard", max_length=512)
    action_label: str = Field(default="View Details", max_length=100)
    scheduled_at: Optional[datetime] = None
    extra_metadata: Dict[str, Any] = Field(default_factory=dict)


class CampaignUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    audience: Optional[CampaignAudience] = None
    target_founder_ids: Optional[List[str]] = None
    channels: Optional[List[CampaignChannel]] = None
    title: Optional[str] = Field(None, max_length=255)
    body: Optional[str] = None
    deep_link: Optional[str] = Field(None, max_length=512)
    action_label: Optional[str] = Field(None, max_length=100)
    scheduled_at: Optional[datetime] = None
    extra_metadata: Optional[Dict[str, Any]] = None


class CampaignResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: Optional[str] = None
    audience: str
    target_founder_ids: Optional[List[str]] = None
    channels: List[str]
    title: str
    body: str
    deep_link: str
    action_label: str
    status: str
    scheduled_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    stats_sent: int = 0
    stats_delivered: int = 0
    stats_failed: int = 0
    stats_read: int = 0
    stats_clicked: int = 0
    extra_metadata: Dict[str, Any] = Field(default_factory=dict)


class CampaignListResponse(BaseModel):
    items: List[CampaignResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class CampaignAnalytics(BaseModel):
    total_campaigns: int
    total_sent: int
    total_delivered: int
    total_failed: int
    total_read: int
    total_clicked: int
    avg_delivery_rate: float
    avg_ctr: float


class CampaignDeliveryLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    campaign_id: str
    founder_id: str
    founder_name: Optional[str] = None
    founder_email: Optional[str] = None
    channel: str
    status: str
    error_message: Optional[str] = None
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    clicked_at: Optional[datetime] = None
    created_at: datetime


class CampaignDeliveryLogListResponse(BaseModel):
    items: List[CampaignDeliveryLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ── Notification Template Schemas ──────────────────────────────────────────────

class NotificationTemplateCreate(BaseModel):
    name: str = Field(..., max_length=255)
    category: str = Field(..., max_length=50)
    subject: str = Field(..., max_length=255)
    body: str
    deep_link: str = Field(default="/founder/dashboard", max_length=512)
    action_label: str = Field(default="View Details", max_length=100)
    default_channels: List[CampaignChannel] = Field(default_factory=lambda: [CampaignChannel.IN_APP])
    variables: List[str] = Field(default_factory=list)


class NotificationTemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    category: Optional[str] = Field(None, max_length=50)
    subject: Optional[str] = Field(None, max_length=255)
    body: Optional[str] = None
    deep_link: Optional[str] = Field(None, max_length=512)
    action_label: Optional[str] = Field(None, max_length=100)
    default_channels: Optional[List[CampaignChannel]] = None
    variables: Optional[List[str]] = None


class NotificationTemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    category: str
    subject: str
    body: str
    deep_link: str
    action_label: str
    default_channels: List[str]
    variables: List[str]
    created_at: datetime
    updated_at: datetime


# ── Push Subscribers & Preferences Admin Views ─────────────────────────────────

class PushSubscriberResponse(BaseModel):
    id: str
    founder_id: str
    founder_name: Optional[str] = None
    founder_email: Optional[str] = None
    endpoint: str
    user_agent: Optional[str] = None
    created_at: datetime
    last_used_at: Optional[datetime] = None


class PushSubscriberListResponse(BaseModel):
    items: List[PushSubscriberResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class FounderPreferenceAdminView(BaseModel):
    founder_id: str
    founder_name: Optional[str] = None
    founder_email: Optional[str] = None
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


class FounderPreferenceAdminListResponse(BaseModel):
    items: List[FounderPreferenceAdminView]
    total: int
    page: int
    page_size: int
    total_pages: int


class CampaignTestSendRequest(BaseModel):
    target_founder_id: str
    preview_variables: Dict[str, str] = Field(default_factory=dict)

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import Base


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        Index("ix_notifications_founder_unread", "founder_id", "is_read", "is_dismissed", "created_at"),
        Index("ix_notifications_founder_cat", "founder_id", "category", "is_dismissed", "created_at"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    founder_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    notification_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # VALIDATION, REALITY_SPRINT, BUILD_REQUEST, MARKETING, SYSTEM
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    deep_link: Mapped[str] = mapped_column(String(512), nullable=False, default="/founder/notifications")
    action_label: Mapped[str] = mapped_column(String(100), nullable=False, default="View Details")
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="NORMAL", index=True)  # LOW, NORMAL, HIGH
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="ACTIVE", index=True)  # ACTIVE, EXPIRED

    source_module: Mapped[str | None] = mapped_column(String(100), nullable=True)
    source_record_id: Mapped[str | None] = mapped_column(String(36), nullable=True)

    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    is_dismissed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    dismissed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    extra_metadata: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True
    )

    founder = relationship("UserORM", backref="notifications")


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    founder_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, nullable=False
    )
    browser_push_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    email_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    validation_notifications: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    sprint_notifications: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    build_notifications: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    marketing_notifications: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    system_notifications: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    quiet_hours_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    quiet_hours_start: Mapped[str] = mapped_column(String(5), nullable=False, default="22:00")
    quiet_hours_end: Mapped[str] = mapped_column(String(5), nullable=False, default="08:00")

    notification_frequency: Mapped[str] = mapped_column(String(20), nullable=False, default="INSTANT")

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )

    founder = relationship("UserORM", backref="notification_preference", uselist=False)


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    founder_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    endpoint: Mapped[str] = mapped_column(Text, nullable=False, unique=True, index=True)
    p256dh_key: Mapped[str] = mapped_column(Text, nullable=False)
    auth_key: Mapped[str] = mapped_column(Text, nullable=False)
    user_agent: Mapped[str | None] = mapped_column(String(512), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    founder = relationship("UserORM", backref="push_subscriptions")


class MarketingCampaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    cta_label: Mapped[str] = mapped_column(String(100), nullable=False, default="View Details")
    cta_destination: Mapped[str] = mapped_column(String(512), nullable=False, default="/founder")
    delivery_type: Mapped[str] = mapped_column(String(50), nullable=False, default="IN_APP_AND_PUSH")
    category: Mapped[str] = mapped_column(String(50), nullable=False, default="MARKETING", index=True)
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="NORMAL")
    audience_type: Mapped[str] = mapped_column(String(50), nullable=False, default="ALL_FOUNDERS", index=True)
    target_founder_ids: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="DRAFT", index=True)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    sent_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    delivered_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    failed_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    read_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    clicked_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    created_by_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )

    delivery_logs = relationship("CampaignDeliveryLog", back_populates="campaign", cascade="all, delete-orphan")


class CampaignDeliveryLog(Base):
    __tablename__ = "campaign_delivery_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    campaign_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("campaigns.id", ondelete="CASCADE"), index=True, nullable=True
    )
    founder_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    notification_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("notifications.id", ondelete="SET NULL"), nullable=True
    )
    delivery_channel: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # IN_APP, PUSH
    status: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # SENT, DELIVERED, FAILED, SUPPRESSED_PREFERENCE, SUPPRESSED_QUIET_HOURS
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_clicked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    clicked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True
    )

    campaign = relationship("MarketingCampaign", back_populates="delivery_logs")
    founder = relationship("UserORM", backref="campaign_delivery_logs")


class NotificationTemplate(Base):
    __tablename__ = "notification_templates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False, default="MARKETING", index=True)
    title_template: Mapped[str] = mapped_column(String(255), nullable=False)
    body_template: Mapped[str] = mapped_column(Text, nullable=False)
    cta_label: Mapped[str] = mapped_column(String(100), nullable=False, default="View Details")
    cta_destination: Mapped[str] = mapped_column(String(512), nullable=False, default="/founder")
    delivery_type: Mapped[str] = mapped_column(String(50), nullable=False, default="IN_APP_AND_PUSH")
    is_system_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )


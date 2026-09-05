from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import Base


class BuildRequest(Base):
    __tablename__ = "build_requests"
    __table_args__ = (
        Index("ix_build_requests_founder_archive", "founder_id", "is_archived", "status"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    founder_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    startup_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    product_category: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    target_customer: Mapped[str | None] = mapped_column(String(255), nullable=True)
    target_market: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    founder_stage: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    priority: Mapped[str] = mapped_column(String(50), nullable=False, default="NORMAL", index=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="SUBMITTED", index=True)
    estimated_duration_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    current_phase: Mapped[str | None] = mapped_column(String(100), nullable=True)
    current_work: Mapped[str | None] = mapped_column(Text, nullable=True)
    current_milestone: Mapped[str | None] = mapped_column(String(255), nullable=True)
    progress_percentage: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    execution_mode: Mapped[str] = mapped_column(String(50), nullable=False, default="v1")
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    is_archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    extra_metadata: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    # Unread counters for notifications
    founder_unread_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    admin_unread_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Production idempotency key (Fix 2)
    idempotency_key: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)


    # Future integration link placeholders (Stage 7 and later)
    project_slug: Mapped[str | None] = mapped_column(String(255), nullable=True)
    project_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    workspace_id: Mapped[str | None] = mapped_column(String(36), nullable=True)

    # Lifecycle timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        index=True,
    )
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expected_completion_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    founder: Mapped["UserORM"] = relationship("UserORM", lazy="selectin")
    attachments: Mapped[list["BuildRequestAttachment"]] = relationship(
        "BuildRequestAttachment", back_populates="build_request", cascade="all, delete-orphan"
    )
    timeline_events: Mapped[list["BuildRequestTimelineEvent"]] = relationship(
        "BuildRequestTimelineEvent", back_populates="build_request", cascade="all, delete-orphan", order_by="BuildRequestTimelineEvent.created_at"
    )
    messages: Mapped[list["BuildRequestMessage"]] = relationship(
        "BuildRequestMessage", back_populates="build_request", cascade="all, delete-orphan", order_by="BuildRequestMessage.created_at"
    )


class BuildRequestAttachment(Base):
    __tablename__ = "build_request_attachments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    build_request_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("build_requests.id", ondelete="CASCADE"), index=True, nullable=False
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    download_url: Mapped[str] = mapped_column(String(500), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    build_request: Mapped[BuildRequest] = relationship("BuildRequest", back_populates="attachments")


class BuildRequestTimelineEvent(Base):
    __tablename__ = "build_request_timeline_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    build_request_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("build_requests.id", ondelete="CASCADE"), index=True, nullable=False
    )
    event_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True
    )

    build_request: Mapped[BuildRequest] = relationship("BuildRequest", back_populates="timeline_events")


class BuildRequestMessage(Base):
    __tablename__ = "build_request_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    build_request_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("build_requests.id", ondelete="CASCADE"), index=True, nullable=False
    )
    sender_type: Mapped[str] = mapped_column(String(50), nullable=False)
    sender_id: Mapped[str] = mapped_column(String(36), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True
    )

    build_request: Mapped[BuildRequest] = relationship("BuildRequest", back_populates="messages")

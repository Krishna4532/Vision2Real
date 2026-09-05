from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import Base


class RealitySprint(Base):
    __tablename__ = "reality_sprints"
    __table_args__ = (
        Index("ix_reality_sprints_founder_archive", "founder_id", "is_archived", "status"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    founder_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    startup_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    target_customer: Mapped[str | None] = mapped_column(String(255), nullable=True)
    target_market: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    founder_stage: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="SUBMITTED", index=True)
    priority: Mapped[str] = mapped_column(String(50), nullable=False, default="NORMAL", index=True)
    request_source: Mapped[str] = mapped_column(String(100), nullable=False, default="FOUNDER_WORKSPACE")
    estimated_duration_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    execution_mode: Mapped[str] = mapped_column(String(50), nullable=False, default="v1")
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    is_archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    extra_metadata: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    # Future reference placeholders (unconstrained strings/UUIDs for V2 extension)
    project_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    workspace_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    roadmap_id: Mapped[str | None] = mapped_column(String(36), nullable=True)

    # Core audit timestamps
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

    # Workflow lifecycle timestamps (updated automatically on status transitions)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    review_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    founder: Mapped["UserORM"] = relationship("UserORM", lazy="selectin")
    attachments: Mapped[list["RealitySprintAttachment"]] = relationship(
        "RealitySprintAttachment", back_populates="sprint", cascade="all, delete-orphan"
    )
    activities: Mapped[list["RealitySprintActivity"]] = relationship(
        "RealitySprintActivity", back_populates="sprint", cascade="all, delete-orphan"
    )


class RealitySprintAttachment(Base):
    __tablename__ = "reality_sprint_attachments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    reality_sprint_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("reality_sprints.id", ondelete="CASCADE"), index=True, nullable=False
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

    sprint: Mapped[RealitySprint] = relationship("RealitySprint", back_populates="attachments")


class RealitySprintActivity(Base):
    """Structured activity and audit log for Reality Sprint operations."""
    __tablename__ = "reality_sprint_activities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    reality_sprint_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("reality_sprints.id", ondelete="CASCADE"), index=True, nullable=False
    )
    actor_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    actor_role: Mapped[str] = mapped_column(String(50), nullable=False, default="SUPER_ADMIN")
    event_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True
    )

    sprint: Mapped[RealitySprint] = relationship("RealitySprint", back_populates="activities")



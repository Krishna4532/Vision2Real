from __future__ import annotations

import uuid
from datetime import datetime, timezone
from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import Base


class Validation(Base):
    __tablename__ = "validations"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True
    )
    founder_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True
    )
    idea_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("ideas.id", ondelete="CASCADE"), index=True, nullable=True
    )
    guest_session_id: Mapped[str | None] = mapped_column(String(255), index=True, nullable=True)
    source: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="QUEUED", nullable=False, index=True)
    overall_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    recommendation: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # LLM provenance
    llm_provider: Mapped[str | None] = mapped_column(String(50), nullable=True)
    llm_model: Mapped[str | None] = mapped_column(String(50), nullable=True)
    prompt_version: Mapped[str | None] = mapped_column(String(50), nullable=True)
    report_schema_version: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Timing
    processing_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    provider_latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Token accounting
    total_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    prompt_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    completion_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    estimated_cost: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Admin fields (reserved for future Admin Workspace)
    review_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    reviewed_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    inputs: Mapped["ValidationInput"] = relationship(
        "ValidationInput", back_populates="validation", uselist=False, cascade="all, delete-orphan"
    )
    attachments: Mapped[list["ValidationAttachment"]] = relationship(
        "ValidationAttachment", back_populates="validation", cascade="all, delete-orphan"
    )
    events: Mapped[list["ValidationEvent"]] = relationship(
        "ValidationEvent", back_populates="validation", cascade="all, delete-orphan", order_by="ValidationEvent.created_at"
    )
    report: Mapped["ValidationReport | None"] = relationship(
        "ValidationReport", back_populates="validation", uselist=False, cascade="all, delete-orphan"
    )


class ValidationInput(Base):
    __tablename__ = "validation_inputs"

    validation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("validations.id", ondelete="CASCADE"), primary_key=True
    )
    idea_description: Mapped[str] = mapped_column(Text, nullable=False)
    target_customer: Mapped[str | None] = mapped_column(String(255), nullable=True)
    target_market: Mapped[str | None] = mapped_column(String(255), nullable=True)
    founder_stage: Mapped[str | None] = mapped_column(String(100), nullable=True)

    validation: Mapped["Validation"] = relationship("Validation", back_populates="inputs")


class ValidationAttachment(Base):
    __tablename__ = "validation_attachments"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True
    )
    validation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("validations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    validation: Mapped["Validation"] = relationship("Validation", back_populates="attachments")


class ValidationEvent(Base):
    """Structured audit log of lifecycle events for each validation."""
    __tablename__ = "validation_events"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True
    )
    validation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("validations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    event_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True
    )

    validation: Mapped["Validation"] = relationship("Validation", back_populates="events")


class ValidationReport(Base):
    """Persisted structured JSON report produced by the AI engine."""
    __tablename__ = "validation_reports"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True
    )
    validation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("validations.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    report_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    validation: Mapped["Validation"] = relationship("Validation", back_populates="report")

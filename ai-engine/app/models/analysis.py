from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import JSON, String, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import Base

if TYPE_CHECKING:
    from app.models.evidence import ClaimORM, ResearchResultORM, CompetitionResultORM, CustomerResultORM


class AnalysisJobORM(Base):
    __tablename__ = "analysis_jobs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    raw_idea: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)
    current_stage: Mapped[str] = mapped_column(String(64), default="pre_flight", nullable=False)
    structured_result: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    classification: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    preflight: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    
    # Phase 2 fields
    research_status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)
    competition_status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)
    customer_status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)
    
    errors: Mapped[list[str] | None] = mapped_column(JSON, nullable=True, default=list)
    warnings: Mapped[list[str] | None] = mapped_column(JSON, nullable=True, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Phase 2 relationships
    claims: Mapped[list[ClaimORM]] = relationship("ClaimORM", lazy="selectin", cascade="all, delete-orphan")
    research_result: Mapped[ResearchResultORM | None] = relationship("ResearchResultORM", lazy="selectin", cascade="all, delete-orphan", uselist=False)
    competition_result: Mapped[CompetitionResultORM | None] = relationship("CompetitionResultORM", lazy="selectin", cascade="all, delete-orphan", uselist=False)
    customer_result: Mapped[CustomerResultORM | None] = relationship("CustomerResultORM", lazy="selectin", cascade="all, delete-orphan", uselist=False)

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, String, Text, DateTime, Float, ForeignKey, Table, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import Base


# Association table for many-to-many claim-evidence relationships
claim_evidence_association = Table(
    "claim_evidence",
    Base.metadata,
    Column("claim_id", String(64), ForeignKey("claims.id"), primary_key=True),
    Column("evidence_id", String(64), ForeignKey("evidence_items.id"), primary_key=True),
)

# Association table for many-to-many source relationships
evidence_source_association = Table(
    "evidence_source",
    Base.metadata,
    Column("evidence_id", String(64), ForeignKey("evidence_items.id"), primary_key=True),
    Column("source_id", String(64), ForeignKey("sources.id"), primary_key=True),
)


class SourceORM(Base):
    __tablename__ = "sources"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    url: Mapped[str | None] = mapped_column(Text, nullable=True)
    title: Mapped[str | None] = mapped_column(Text, nullable=True)
    publisher_domain: Mapped[str | None] = mapped_column(String(255), nullable=True)
    publication_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    retrieval_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    source_type: Mapped[str] = mapped_column(String(32), default="web", nullable=False)
    credibility_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    credibility_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    retrieval_status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)
    additional_metadata: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class EvidenceORM(Base):
    __tablename__ = "evidence_items"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    excerpt: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence_type: Mapped[str] = mapped_column(String(32), default="direct", nullable=False)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    relevance_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Many-to-many relationship to claims
    claims: Mapped[list[ClaimORM]] = relationship("ClaimORM", secondary=claim_evidence_association, back_populates="evidence_items", lazy="selectin")
    
    # Relationship to sources (many-to-many)
    sources: Mapped[list[SourceORM]] = relationship("SourceORM", secondary=evidence_source_association, lazy="selectin")


class ClaimORM(Base):
    __tablename__ = "claims"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    analysis_id: Mapped[str] = mapped_column(String(64), ForeignKey("analysis_jobs.id"), nullable=False, index=True)
    claim_text: Mapped[str] = mapped_column(Text, nullable=False)
    claim_type: Mapped[str] = mapped_column(String(64), default="other", nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="unknown", nullable=False)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    provenance: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationship to evidence items (many-to-many)
    evidence_items: Mapped[list[EvidenceORM]] = relationship("EvidenceORM", secondary=claim_evidence_association, back_populates="claims", lazy="selectin")


class ResearchResultORM(Base):
    __tablename__ = "research_results"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    analysis_id: Mapped[str] = mapped_column(String(64), ForeignKey("analysis_jobs.id"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(32), default="failed", nullable=False)
    findings: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    errors: Mapped[list[str] | None] = mapped_column(JSON, nullable=True, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class CompetitionResultORM(Base):
    __tablename__ = "competition_results"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    analysis_id: Mapped[str] = mapped_column(String(64), ForeignKey("analysis_jobs.id"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(32), default="failed", nullable=False)
    findings: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    errors: Mapped[list[str] | None] = mapped_column(JSON, nullable=True, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class CustomerResultORM(Base):
    __tablename__ = "customer_results"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    analysis_id: Mapped[str] = mapped_column(String(64), ForeignKey("analysis_jobs.id"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(32), default="failed", nullable=False)
    findings: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    errors: Mapped[list[str] | None] = mapped_column(JSON, nullable=True, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

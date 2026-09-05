from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import JSON, String, Text, DateTime, ForeignKey, Table, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import Base
from app.models.evidence import EvidenceORM

if TYPE_CHECKING:
    from app.models.analysis import AnalysisJobORM

# Many-to-many: a Risk can be backed by multiple Evidence items, and a single
# Evidence item could in principle back multiple risks. Reuses the existing
# Phase 2 EvidenceORM table rather than duplicating evidence storage, per the
# "reuse the many-to-many evidence model, don't flatten provenance" spec
# requirement.
risk_evidence_association = Table(
    "risk_evidence",
    Base.metadata,
    Column("risk_id", String(64), ForeignKey("risks.id"), primary_key=True),
    Column("evidence_id", String(64), ForeignKey("evidence_items.id"), primary_key=True),
)


# Many-to-many: a Red Team finding can be backed by multiple Evidence items.
# Mirrors risk_evidence_association for the same reason (reuse evidence
# storage, preserve provenance).
red_team_finding_evidence_association = Table(
    "red_team_finding_evidence",
    Base.metadata,
    Column("finding_id", String(64), ForeignKey("red_team_findings.id"), primary_key=True),
    Column("evidence_id", String(64), ForeignKey("evidence_items.id"), primary_key=True),
)


class RiskORM(Base):
    __tablename__ = "risks"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    analysis_id: Mapped[str] = mapped_column(String(64), ForeignKey("analysis_jobs.id"), nullable=False, index=True)
    risk_statement: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(32), nullable=False)
    severity: Mapped[str] = mapped_column(String(16), nullable=False)
    likelihood: Mapped[str] = mapped_column(String(16), nullable=False)
    impact: Mapped[str] = mapped_column(Text, nullable=False)
    classification: Mapped[str] = mapped_column(String(16), nullable=False)
    claim_ids: Mapped[list[str] | None] = mapped_column(JSON, nullable=True, default=list)
    mitigation: Mapped[str] = mapped_column(Text, nullable=False)
    falsification_criteria: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    evidence_items: Mapped[list[EvidenceORM]] = relationship(
        "EvidenceORM", secondary=risk_evidence_association, lazy="selectin"
    )


class RedTeamFindingORM(Base):
    __tablename__ = "red_team_findings"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    analysis_id: Mapped[str] = mapped_column(String(64), ForeignKey("analysis_jobs.id"), nullable=False, index=True)
    assumption_challenged: Mapped[str] = mapped_column(Text, nullable=False)
    objection: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(32), nullable=False)
    severity: Mapped[str] = mapped_column(String(16), nullable=False)
    classification: Mapped[str] = mapped_column(String(16), nullable=False)
    claim_ids: Mapped[list[str] | None] = mapped_column(JSON, nullable=True, default=list)
    falsification_criteria: Mapped[str] = mapped_column(Text, nullable=False)
    is_potentially_fatal: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    evidence_items: Mapped[list[EvidenceORM]] = relationship(
        "EvidenceORM", secondary=red_team_finding_evidence_association, lazy="selectin"
    )


class Phase3ResultORM(Base):
    """Aggregate storage for the parts of Phase 3 that don't need their own
    relational tables (Synthesis, Business Model, Feasibility, Market,
    Decision, Validation Plan). Risks and Red Team findings get their own
    relational tables (RiskORM / RedTeamFindingORM above) specifically to
    preserve evidence traceability; everything else here is already fully
    evidence-traceable via evidence_ids embedded in each Pydantic model,
    which is sufficient since those substructures are not independently
    queried/joined against elsewhere.
    """
    __tablename__ = "phase3_results"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    analysis_id: Mapped[str] = mapped_column(String(64), ForeignKey("analysis_jobs.id"), nullable=False, index=True, unique=True)

    synthesis_status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)
    synthesis: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    business_model_status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)
    business_model: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    feasibility_status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)
    feasibility: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    market_status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)
    market: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    risk_status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)
    red_team_status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)

    decision: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    validation_plan: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    errors: Mapped[list[str] | None] = mapped_column(JSON, nullable=True, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Reciprocal side of AnalysisJobORM.phase3_result (which declares
    # back_populates="analysis_job"). Both sides of a back_populates pair
    # must be declared or SQLAlchemy's mapper configuration fails at
    # startup - this was the missing half.
    analysis_job: Mapped["AnalysisJobORM"] = relationship(
        "AnalysisJobORM",
        back_populates="phase3_result",
    )

"""phase_3_schema

Revision ID: 6fb45cdad056
Revises: fd6eaa890a34
Create Date: 2026-08-16 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '6fb45cdad056'
down_revision = 'fd6eaa890a34'
branch_labels = None
depends_on = None


from alembic import context, op

def upgrade() -> None:
    if context.is_offline_mode():
        tables = []
    else:
        bind = op.get_bind()
        inspector = sa.inspect(bind)
        tables = inspector.get_table_names()

    # 1. Create phase3_results table (aggregate storage for Synthesis,
    # Business Model, Feasibility, Decision, and Validation Plan).
    if "phase3_results" not in tables:
        op.create_table(
            "phase3_results",
            sa.Column("id", sa.String(length=64), nullable=False),
            sa.Column("analysis_id", sa.String(length=64), nullable=False),
            sa.Column("synthesis_status", sa.String(length=32), nullable=False),
            sa.Column("synthesis", sa.JSON(), nullable=True),
            sa.Column("business_model_status", sa.String(length=32), nullable=False),
            sa.Column("business_model", sa.JSON(), nullable=True),
            sa.Column("feasibility_status", sa.String(length=32), nullable=False),
            sa.Column("feasibility", sa.JSON(), nullable=True),
            sa.Column("risk_status", sa.String(length=32), nullable=False),
            sa.Column("decision", sa.JSON(), nullable=True),
            sa.Column("validation_plan", sa.JSON(), nullable=True),
            sa.Column("errors", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["analysis_id"], ["analysis_jobs.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_phase3_results_id"), "phase3_results", ["id"], unique=False)
        op.create_index(op.f("ix_phase3_results_analysis_id"), "phase3_results", ["analysis_id"], unique=True)

    # 2. Create risks table (relational, one row per risk, for founder-facing
    # risk-matrix rendering and evidence traceability).
    if "risks" not in tables:
        op.create_table(
            "risks",
            sa.Column("id", sa.String(length=64), nullable=False),
            sa.Column("analysis_id", sa.String(length=64), nullable=False),
            sa.Column("risk_statement", sa.Text(), nullable=False),
            sa.Column("category", sa.String(length=32), nullable=False),
            sa.Column("severity", sa.String(length=16), nullable=False),
            sa.Column("likelihood", sa.String(length=16), nullable=False),
            sa.Column("impact", sa.Text(), nullable=False),
            sa.Column("classification", sa.String(length=16), nullable=False),
            sa.Column("claim_ids", sa.JSON(), nullable=True),
            sa.Column("mitigation", sa.Text(), nullable=False),
            sa.Column("falsification_criteria", sa.Text(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["analysis_id"], ["analysis_jobs.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_risks_id"), "risks", ["id"], unique=False)
        op.create_index(op.f("ix_risks_analysis_id"), "risks", ["analysis_id"], unique=False)

    # 3. Create risk_evidence association table (many-to-many: reuses the
    # existing Phase 2 evidence_items table rather than duplicating evidence
    # storage, preserving Conclusion -> Claim -> Evidence -> Source
    # traceability end to end).
    if "risk_evidence" not in tables:
        op.create_table(
            "risk_evidence",
            sa.Column("risk_id", sa.String(length=64), nullable=False),
            sa.Column("evidence_id", sa.String(length=64), nullable=False),
            sa.ForeignKeyConstraint(["risk_id"], ["risks.id"]),
            sa.ForeignKeyConstraint(["evidence_id"], ["evidence_items.id"]),
            sa.PrimaryKeyConstraint("risk_id", "evidence_id"),
        )


def downgrade() -> None:
    op.drop_table("risk_evidence")
    op.drop_table("risks")
    op.drop_table("phase3_results")

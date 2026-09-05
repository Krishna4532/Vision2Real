"""phase_3_market_red_team

Revision ID: f29fc77e15a2
Revises: 6fb45cdad056
Create Date: 2026-08-16 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f29fc77e15a2'
down_revision = '6fb45cdad056'
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
    phase3_columns = {c["name"] for c in inspector.get_columns("phase3_results")} if "phase3_results" in tables else set()

    # 1. Add market_status/market and red_team_status columns to the
    # existing phase3_results aggregate table. Market has no dedicated
    # relational table (it doesn't need one - MarketSignal.evidence_ids are
    # embedded and not independently queried), so it's stored the same way
    # Synthesis/BusinessModel/Feasibility already are. Red Team DOES get its
    # own relational table (see #2 below) because, like Risk, its findings
    # need queryable evidence traceability.
    if "phase3_results" in tables:
        if "market_status" not in phase3_columns:
            op.add_column("phase3_results", sa.Column("market_status", sa.String(length=32), nullable=False, server_default="pending"))
        if "market" not in phase3_columns:
            op.add_column("phase3_results", sa.Column("market", sa.JSON(), nullable=True))
        if "red_team_status" not in phase3_columns:
            op.add_column("phase3_results", sa.Column("red_team_status", sa.String(length=32), nullable=False, server_default="pending"))

    # 2. Create red_team_findings table (relational, mirrors risks table).
    if "red_team_findings" not in tables:
        op.create_table(
            "red_team_findings",
            sa.Column("id", sa.String(length=64), nullable=False),
            sa.Column("analysis_id", sa.String(length=64), nullable=False),
            sa.Column("assumption_challenged", sa.Text(), nullable=False),
            sa.Column("objection", sa.Text(), nullable=False),
            sa.Column("category", sa.String(length=32), nullable=False),
            sa.Column("severity", sa.String(length=16), nullable=False),
            sa.Column("classification", sa.String(length=16), nullable=False),
            sa.Column("claim_ids", sa.JSON(), nullable=True),
            sa.Column("falsification_criteria", sa.Text(), nullable=False),
            sa.Column("is_potentially_fatal", sa.Boolean(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["analysis_id"], ["analysis_jobs.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_red_team_findings_id"), "red_team_findings", ["id"], unique=False)
        op.create_index(op.f("ix_red_team_findings_analysis_id"), "red_team_findings", ["analysis_id"], unique=False)

    # 3. Create red_team_finding_evidence association table (many-to-many,
    # reuses the existing evidence_items table - same pattern as
    # risk_evidence).
    if "red_team_finding_evidence" not in tables:
        op.create_table(
            "red_team_finding_evidence",
            sa.Column("finding_id", sa.String(length=64), nullable=False),
            sa.Column("evidence_id", sa.String(length=64), nullable=False),
            sa.ForeignKeyConstraint(["finding_id"], ["red_team_findings.id"]),
            sa.ForeignKeyConstraint(["evidence_id"], ["evidence_items.id"]),
            sa.PrimaryKeyConstraint("finding_id", "evidence_id"),
        )


def downgrade() -> None:
    op.drop_table("red_team_finding_evidence")
    op.drop_table("red_team_findings")
    with op.batch_alter_table("phase3_results") as batch_op:
        batch_op.drop_column("red_team_status")
        batch_op.drop_column("market")
        batch_op.drop_column("market_status")

"""phase_2_schema

Revision ID: fd6eaa890a34
Revises: 6c36735a64ef
Create Date: 2026-08-14 20:27:48.380651
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'fd6eaa890a34'
down_revision = '6c36735a64ef'
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

    # 1. Create analysis_jobs table
    if "analysis_jobs" not in tables:
        op.create_table(
            "analysis_jobs",
            sa.Column("id", sa.String(length=64), nullable=False),
            sa.Column("raw_idea", sa.Text(), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False),
            sa.Column("current_stage", sa.String(length=64), nullable=False),
            sa.Column("structured_result", sa.JSON(), nullable=True),
            sa.Column("classification", sa.JSON(), nullable=True),
            sa.Column("preflight", sa.JSON(), nullable=True),
            sa.Column("research_status", sa.String(length=32), nullable=False),
            sa.Column("competition_status", sa.String(length=32), nullable=False),
            sa.Column("customer_status", sa.String(length=32), nullable=False),
            sa.Column("errors", sa.JSON(), nullable=True),
            sa.Column("warnings", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_analysis_jobs_id"), "analysis_jobs", ["id"], unique=False)
    else:
        # Check if phase 2 status columns are present
        columns = [c["name"] for c in inspector.get_columns("analysis_jobs")]
        if "research_status" not in columns:
            op.add_column("analysis_jobs", sa.Column("research_status", sa.String(length=32), nullable=False, server_default="pending"))
        if "competition_status" not in columns:
            op.add_column("analysis_jobs", sa.Column("competition_status", sa.String(length=32), nullable=False, server_default="pending"))
        if "customer_status" not in columns:
            op.add_column("analysis_jobs", sa.Column("customer_status", sa.String(length=32), nullable=False, server_default="pending"))

    # 2. Create sources table
    if "sources" not in tables:
        op.create_table(
            "sources",
            sa.Column("id", sa.String(length=64), nullable=False),
            sa.Column("url", sa.Text(), nullable=True),
            sa.Column("title", sa.Text(), nullable=True),
            sa.Column("publisher_domain", sa.String(length=255), nullable=True),
            sa.Column("publication_date", sa.DateTime(timezone=True), nullable=True),
            sa.Column("retrieval_date", sa.DateTime(timezone=True), nullable=True),
            sa.Column("source_type", sa.String(length=32), nullable=False),
            sa.Column("credibility_notes", sa.Text(), nullable=True),
            sa.Column("credibility_score", sa.Float(), nullable=True),
            sa.Column("retrieval_status", sa.String(length=32), nullable=False),
            sa.Column("metadata", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_sources_id"), "sources", ["id"], unique=False)

    # 3. Create claims table
    if "claims" not in tables:
        op.create_table(
            "claims",
            sa.Column("id", sa.String(length=64), nullable=False),
            sa.Column("analysis_id", sa.String(length=64), nullable=False),
            sa.Column("claim_text", sa.Text(), nullable=False),
            sa.Column("claim_type", sa.String(length=64), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False),
            sa.Column("confidence", sa.Float(), nullable=True),
            sa.Column("provenance", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["analysis_id"], ["analysis_jobs.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_claims_id"), "claims", ["id"], unique=False)
        op.create_index(op.f("ix_claims_analysis_id"), "claims", ["analysis_id"], unique=False)

    # 4. Create evidence_items table
    if "evidence_items" not in tables:
        op.create_table(
            "evidence_items",
            sa.Column("id", sa.String(length=64), nullable=False),
            sa.Column("excerpt", sa.Text(), nullable=True),
            sa.Column("evidence_type", sa.String(length=32), nullable=False),
            sa.Column("confidence", sa.Float(), nullable=True),
            sa.Column("relevance_notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_evidence_items_id"), "evidence_items", ["id"], unique=False)

    # 5. Create claim_evidence association table
    if "claim_evidence" not in tables:
        op.create_table(
            "claim_evidence",
            sa.Column("claim_id", sa.String(length=64), nullable=False),
            sa.Column("evidence_id", sa.String(length=64), nullable=False),
            sa.ForeignKeyConstraint(["claim_id"], ["claims.id"]),
            sa.ForeignKeyConstraint(["evidence_id"], ["evidence_items.id"]),
            sa.PrimaryKeyConstraint("claim_id", "evidence_id"),
        )

    # 6. Create evidence_source association table
    if "evidence_source" not in tables:
        op.create_table(
            "evidence_source",
            sa.Column("evidence_id", sa.String(length=64), nullable=False),
            sa.Column("source_id", sa.String(length=64), nullable=False),
            sa.ForeignKeyConstraint(["evidence_id"], ["evidence_items.id"]),
            sa.ForeignKeyConstraint(["source_id"], ["sources.id"]),
            sa.PrimaryKeyConstraint("evidence_id", "source_id"),
        )

    # 7. Create research_results table
    if "research_results" not in tables:
        op.create_table(
            "research_results",
            sa.Column("id", sa.String(length=64), nullable=False),
            sa.Column("analysis_id", sa.String(length=64), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False),
            sa.Column("findings", sa.JSON(), nullable=True),
            sa.Column("errors", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["analysis_id"], ["analysis_jobs.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_research_results_id"), "research_results", ["id"], unique=False)
        op.create_index(op.f("ix_research_results_analysis_id"), "research_results", ["analysis_id"], unique=False)

    # 8. Create competition_results table
    if "competition_results" not in tables:
        op.create_table(
            "competition_results",
            sa.Column("id", sa.String(length=64), nullable=False),
            sa.Column("analysis_id", sa.String(length=64), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False),
            sa.Column("findings", sa.JSON(), nullable=True),
            sa.Column("errors", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["analysis_id"], ["analysis_jobs.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_competition_results_id"), "competition_results", ["id"], unique=False)
        op.create_index(op.f("ix_competition_results_analysis_id"), "competition_results", ["analysis_id"], unique=False)

    # 9. Create customer_results table
    if "customer_results" not in tables:
        op.create_table(
            "customer_results",
            sa.Column("id", sa.String(length=64), nullable=False),
            sa.Column("analysis_id", sa.String(length=64), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False),
            sa.Column("findings", sa.JSON(), nullable=True),
            sa.Column("errors", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["analysis_id"], ["analysis_jobs.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_customer_results_id"), "customer_results", ["id"], unique=False)
        op.create_index(op.f("ix_customer_results_analysis_id"), "customer_results", ["analysis_id"], unique=False)


def downgrade() -> None:
    op.drop_table("customer_results")
    op.drop_table("competition_results")
    op.drop_table("research_results")
    op.drop_table("evidence_source")
    op.drop_table("claim_evidence")
    op.drop_table("evidence_items")
    op.drop_table("claims")
    op.drop_table("sources")

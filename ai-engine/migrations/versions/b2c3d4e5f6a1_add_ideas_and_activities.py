"""add ideas and activities tables

Revision ID: b2c3d4e5f6a1
Revises: a1b2c3d4e5f6
Create Date: 2026-08-30 00:00:00.000000
"""

from alembic import context, op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b2c3d4e5f6a1'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    if context.is_offline_mode():
        tables = []
    else:
        bind = op.get_bind()
        inspector = sa.inspect(bind)
        tables = inspector.get_table_names()

    # 1. Create ideas table
    if "ideas" not in tables:
        op.create_table(
            "ideas",
            sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
            sa.Column("slug", sa.String(length=255), nullable=False),
            sa.Column("founder_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("problem_statement", sa.Text(), nullable=False),
            sa.Column("proposed_solution", sa.Text(), nullable=False),
            sa.Column("industry", sa.String(length=100), nullable=False),
            sa.Column("target_market", sa.String(length=255), nullable=False),
            sa.Column("current_stage", sa.String(length=50), nullable=False, server_default="DRAFT"),
            sa.Column("status", sa.String(length=50), nullable=False, server_default="ACTIVE"),
            sa.Column("validation_status", sa.String(length=50), nullable=False, server_default="UNVALIDATED"),
            sa.Column("assigned_admin", sa.String(length=36), nullable=True),
            sa.Column("current_owner", sa.String(length=36), nullable=True),
            sa.Column("priority", sa.String(length=50), nullable=True),
            sa.Column("visibility", sa.String(length=50), nullable=False, server_default="PRIVATE"),
            sa.Column("is_archived", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("created_by", sa.String(length=36), nullable=False),
            sa.Column("updated_by", sa.String(length=36), nullable=False),
        )
        op.create_index("ix_ideas_id", "ideas", ["id"])
        op.create_index("ix_ideas_slug", "ideas", ["slug"], unique=True)
        op.create_index("ix_ideas_founder_id", "ideas", ["founder_id"])
        op.create_index("ix_ideas_industry", "ideas", ["industry"])
        op.create_index("ix_ideas_current_stage", "ideas", ["current_stage"])
        op.create_index("ix_ideas_status", "ideas", ["status"])
        op.create_index("ix_ideas_validation_status", "ideas", ["validation_status"])
        op.create_index("ix_ideas_is_archived", "ideas", ["is_archived"])

    # 2. Create idea_activities table
    if "idea_activities" not in tables:
        op.create_table(
            "idea_activities",
            sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
            sa.Column("founder_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("entity_type", sa.String(length=50), nullable=False, server_default="idea"),
            sa.Column("entity_id", sa.String(length=36), nullable=False),
            sa.Column("event_type", sa.String(length=50), nullable=False),
            sa.Column("metadata_json", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        )
        op.create_index("ix_idea_activities_id", "idea_activities", ["id"])
        op.create_index("ix_idea_activities_founder_id", "idea_activities", ["founder_id"])
        op.create_index("ix_idea_activities_entity_id", "idea_activities", ["entity_id"])
        op.create_index("ix_idea_activities_event_type", "idea_activities", ["event_type"])
        op.create_index("ix_idea_activities_created_at", "idea_activities", ["created_at"])


def downgrade() -> None:
    if context.is_offline_mode():
        tables = ["idea_activities", "ideas"]
    else:
        bind = op.get_bind()
        inspector = sa.inspect(bind)
        tables = inspector.get_table_names()

    if "idea_activities" in tables:
        op.drop_table("idea_activities")
    if "ideas" in tables:
        op.drop_table("ideas")

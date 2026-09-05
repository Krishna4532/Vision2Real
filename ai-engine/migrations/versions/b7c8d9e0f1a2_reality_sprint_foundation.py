"""create Reality Sprint request management foundation

Revision ID: b7c8d9e0f1a2
Revises: 4aaf0df4e719
"""

from alembic import context, op
import sqlalchemy as sa


revision = "b7c8d9e0f1a2"
down_revision = "4aaf0df4e719"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if context.is_offline_mode():
        tables = []
    else:
        tables = sa.inspect(op.get_bind()).get_table_names()

    if "reality_sprints" not in tables:
        op.create_table(
            "reality_sprints",
            sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
            sa.Column("founder_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("startup_name", sa.String(length=255), nullable=True),
            sa.Column("description", sa.Text(), nullable=False),
            sa.Column("target_customer", sa.String(length=255), nullable=True),
            sa.Column("target_market", sa.String(length=255), nullable=True),
            sa.Column("founder_stage", sa.String(length=100), nullable=True),
            sa.Column("status", sa.String(length=50), nullable=False, server_default="SUBMITTED"),
            sa.Column("priority", sa.String(length=50), nullable=False, server_default="NORMAL"),
            sa.Column("request_source", sa.String(length=100), nullable=False, server_default="FOUNDER_WORKSPACE"),
            sa.Column("estimated_duration_days", sa.Integer(), nullable=True),
            sa.Column("execution_mode", sa.String(length=50), nullable=False, server_default="v1"),
            sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("is_archived", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("extra_metadata", sa.JSON(), nullable=False),
            sa.Column("project_id", sa.String(length=36), nullable=True),
            sa.Column("workspace_id", sa.String(length=36), nullable=True),
            sa.Column("roadmap_id", sa.String(length=36), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("review_started_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        )
        for column in ("id", "founder_id", "target_market", "founder_stage", "status", "priority", "created_at", "updated_at", "is_archived"):
            op.create_index(f"ix_reality_sprints_{column}", "reality_sprints", [column])

        op.create_index("ix_reality_sprints_founder_archive", "reality_sprints", ["founder_id", "is_archived", "status"])

    if "reality_sprint_attachments" not in tables:
        op.create_table(
            "reality_sprint_attachments",
            sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
            sa.Column("reality_sprint_id", sa.String(length=36), sa.ForeignKey("reality_sprints.id", ondelete="CASCADE"), nullable=False),
            sa.Column("filename", sa.String(length=255), nullable=False),
            sa.Column("original_filename", sa.String(length=255), nullable=False),
            sa.Column("mime_type", sa.String(length=100), nullable=False),
            sa.Column("file_size", sa.Integer(), nullable=False),
            sa.Column("storage_path", sa.String(length=500), nullable=False),
            sa.Column("download_url", sa.String(length=500), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_reality_sprint_attachments_id", "reality_sprint_attachments", ["id"])
        op.create_index("ix_reality_sprint_attachments_sprint_id", "reality_sprint_attachments", ["reality_sprint_id"])


def downgrade() -> None:
    op.drop_table("reality_sprint_attachments")
    op.drop_table("reality_sprints")


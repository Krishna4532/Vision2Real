"""create Build Request foundation tables

Revision ID: c7d8e9f0a1b2
Revises: 63df14cce4af
Create Date: 2026-09-03
"""

from alembic import op
import sqlalchemy as sa


revision = "c7d8e9f0a1b2"
down_revision = "63df14cce4af"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "build_requests",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("founder_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("startup_name", sa.String(length=255), nullable=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("product_category", sa.String(length=100), nullable=True),
        sa.Column("target_customer", sa.String(length=255), nullable=True),
        sa.Column("target_market", sa.String(length=255), nullable=True),
        sa.Column("founder_stage", sa.String(length=100), nullable=True),
        sa.Column("priority", sa.String(length=50), nullable=False, server_default="NORMAL"),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="SUBMITTED"),
        sa.Column("estimated_duration_days", sa.Integer(), nullable=True),
        sa.Column("current_phase", sa.String(length=100), nullable=True),
        sa.Column("current_work", sa.Text(), nullable=True),
        sa.Column("current_milestone", sa.String(length=255), nullable=True),
        sa.Column("progress_percentage", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("execution_mode", sa.String(length=50), nullable=False, server_default="v1"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_archived", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("extra_metadata", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("founder_unread_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("admin_unread_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("project_slug", sa.String(length=255), nullable=True),
        sa.Column("project_id", sa.String(length=36), nullable=True),
        sa.Column("workspace_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expected_completion_at", sa.DateTime(timezone=True), nullable=True),
    )
    for column in (
        "id",
        "founder_id",
        "product_category",
        "target_market",
        "founder_stage",
        "priority",
        "status",
        "is_archived",
        "created_at",
        "updated_at",
    ):
        op.create_index(f"ix_build_requests_{column}", "build_requests", [column])

    op.create_index("ix_build_requests_founder_archive", "build_requests", ["founder_id", "is_archived", "status"])

    op.create_table(
        "build_request_attachments",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column(
            "build_request_id",
            sa.String(length=36),
            sa.ForeignKey("build_requests.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("mime_type", sa.String(length=100), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("storage_path", sa.String(length=500), nullable=False),
        sa.Column("download_url", sa.String(length=500), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_build_request_attachments_id", "build_request_attachments", ["id"])
    op.create_index("ix_build_request_attachments_build_request_id", "build_request_attachments", ["build_request_id"])

    op.create_table(
        "build_request_timeline_events",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column(
            "build_request_id",
            sa.String(length=36),
            sa.ForeignKey("build_requests.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("event_type", sa.String(length=100), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_build_request_timeline_events_id", "build_request_timeline_events", ["id"])
    op.create_index("ix_build_request_timeline_events_build_request_id", "build_request_timeline_events", ["build_request_id"])
    op.create_index("ix_build_request_timeline_events_event_type", "build_request_timeline_events", ["event_type"])
    op.create_index("ix_build_request_timeline_events_created_at", "build_request_timeline_events", ["created_at"])

    op.create_table(
        "build_request_messages",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column(
            "build_request_id",
            sa.String(length=36),
            sa.ForeignKey("build_requests.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("sender_type", sa.String(length=50), nullable=False),
        sa.Column("sender_id", sa.String(length=36), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_build_request_messages_id", "build_request_messages", ["id"])
    op.create_index("ix_build_request_messages_build_request_id", "build_request_messages", ["build_request_id"])
    op.create_index("ix_build_request_messages_created_at", "build_request_messages", ["created_at"])


def downgrade() -> None:
    op.drop_table("build_request_messages")
    op.drop_table("build_request_timeline_events")
    op.drop_table("build_request_attachments")
    op.drop_table("build_requests")

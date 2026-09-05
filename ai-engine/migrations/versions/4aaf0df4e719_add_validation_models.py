"""add validation models

Revision ID: 4aaf0df4e719
Revises: a1b2c3d4e5f6
Create Date: 2026-08-30 16:57:48.322040
"""

from alembic import context, op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '4aaf0df4e719'
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

    # 1. Create validations table
    if "validations" not in tables:
        op.create_table(
            "validations",
            sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
            sa.Column("founder_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
            sa.Column("idea_id", sa.String(length=36), sa.ForeignKey("ideas.id", ondelete="CASCADE"), nullable=True),
            sa.Column("guest_session_id", sa.String(length=255), nullable=True),
            sa.Column("source", sa.String(length=50), nullable=False),
            sa.Column("status", sa.String(length=50), nullable=False, server_default="QUEUED"),
            sa.Column("overall_score", sa.Float(), nullable=True),
            sa.Column("recommendation", sa.String(length=50), nullable=True),
            sa.Column("llm_provider", sa.String(length=50), nullable=True),
            sa.Column("llm_model", sa.String(length=50), nullable=True),
            sa.Column("prompt_version", sa.String(length=50), nullable=True),
            sa.Column("report_schema_version", sa.String(length=50), nullable=True),
            sa.Column("processing_time_ms", sa.Integer(), nullable=True),
            sa.Column("provider_latency_ms", sa.Integer(), nullable=True),
            sa.Column("total_tokens", sa.Integer(), nullable=True),
            sa.Column("prompt_tokens", sa.Integer(), nullable=True),
            sa.Column("completion_tokens", sa.Integer(), nullable=True),
            sa.Column("estimated_cost", sa.Float(), nullable=True),
            sa.Column("review_status", sa.String(length=50), nullable=True),
            sa.Column("reviewed_by", sa.String(length=36), nullable=True),
            sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_validations_id", "validations", ["id"])
        op.create_index("ix_validations_founder_id", "validations", ["founder_id"])
        op.create_index("ix_validations_idea_id", "validations", ["idea_id"])
        op.create_index("ix_validations_guest_session_id", "validations", ["guest_session_id"])
        op.create_index("ix_validations_status", "validations", ["status"])

    # 2. Create validation_inputs table
    if "validation_inputs" not in tables:
        op.create_table(
            "validation_inputs",
            sa.Column("validation_id", sa.String(length=36), sa.ForeignKey("validations.id", ondelete="CASCADE"), primary_key=True, nullable=False),
            sa.Column("idea_description", sa.Text(), nullable=False),
            sa.Column("target_customer", sa.String(length=255), nullable=True),
            sa.Column("target_market", sa.String(length=255), nullable=True),
            sa.Column("founder_stage", sa.String(length=100), nullable=True),
        )

    # 3. Create validation_attachments table
    if "validation_attachments" not in tables:
        op.create_table(
            "validation_attachments",
            sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
            sa.Column("validation_id", sa.String(length=36), sa.ForeignKey("validations.id", ondelete="CASCADE"), nullable=False),
            sa.Column("filename", sa.String(length=255), nullable=False),
            sa.Column("original_filename", sa.String(length=255), nullable=False),
            sa.Column("mime_type", sa.String(length=100), nullable=False),
            sa.Column("storage_path", sa.String(length=500), nullable=False),
            sa.Column("file_size", sa.Integer(), nullable=False),
            sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_validation_attachments_id", "validation_attachments", ["id"])
        op.create_index("ix_validation_attachments_validation_id", "validation_attachments", ["validation_id"])

    # 4. Create validation_events table
    if "validation_events" not in tables:
        op.create_table(
            "validation_events",
            sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
            sa.Column("validation_id", sa.String(length=36), sa.ForeignKey("validations.id", ondelete="CASCADE"), nullable=False),
            sa.Column("event_type", sa.String(length=100), nullable=False),
            sa.Column("metadata_json", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_validation_events_id", "validation_events", ["id"])
        op.create_index("ix_validation_events_validation_id", "validation_events", ["validation_id"])
        op.create_index("ix_validation_events_event_type", "validation_events", ["event_type"])
        op.create_index("ix_validation_events_created_at", "validation_events", ["created_at"])

    # 5. Create validation_reports table
    if "validation_reports" not in tables:
        op.create_table(
            "validation_reports",
            sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
            sa.Column("validation_id", sa.String(length=36), sa.ForeignKey("validations.id", ondelete="CASCADE"), unique=True, nullable=False),
            sa.Column("report_json", sa.JSON(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_validation_reports_id", "validation_reports", ["id"])


def downgrade() -> None:
    if context.is_offline_mode():
        tables = ["validation_reports", "validation_events", "validation_attachments", "validation_inputs", "validations"]
    else:
        bind = op.get_bind()
        inspector = sa.inspect(bind)
        tables = inspector.get_table_names()

    if "validation_reports" in tables:
        op.drop_table("validation_reports")
    if "validation_events" in tables:
        op.drop_table("validation_events")
    if "validation_attachments" in tables:
        op.drop_table("validation_attachments")
    if "validation_inputs" in tables:
        op.drop_table("validation_inputs")
    if "validations" in tables:
        op.drop_table("validations")

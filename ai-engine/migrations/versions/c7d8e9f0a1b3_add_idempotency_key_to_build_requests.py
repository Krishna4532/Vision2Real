"""add idempotency_key to build_requests

Revision ID: c7d8e9f0a1b3
Revises: c7d8e9f0a1b2
Create Date: 2026-09-03
"""

from alembic import op
import sqlalchemy as sa


revision = "c7d8e9f0a1b3"
down_revision = "c7d8e9f0a1b2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "build_requests",
        sa.Column("idempotency_key", sa.String(255), nullable=True),
    )
    op.create_index(
        "ix_build_requests_idempotency_key",
        "build_requests",
        ["idempotency_key"],
    )


def downgrade() -> None:
    op.drop_index("ix_build_requests_idempotency_key", table_name="build_requests")
    op.drop_column("build_requests", "idempotency_key")

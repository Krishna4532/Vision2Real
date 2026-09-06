"""add role column to users

Revision ID: 4cf437502740
Revises: g1a2b3c4d5e6
Create Date: 2026-09-06
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "4cf437502740"
down_revision = "g1a2b3c4d5e6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "role",
            sa.String(length=50),
            nullable=False,
            server_default="FOUNDER",
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "role")
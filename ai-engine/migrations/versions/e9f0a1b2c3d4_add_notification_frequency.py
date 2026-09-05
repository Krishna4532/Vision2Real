"""add notification frequency to notification preferences

Revision ID: e9f0a1b2c3d4
Revises: d8e9f0a1b2c3
Create Date: 2026-09-04 03:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e9f0a1b2c3d4'
down_revision = 'd8e9f0a1b2c3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'notification_preferences',
        sa.Column('notification_frequency', sa.String(length=20), nullable=False, server_default='INSTANT')
    )


def downgrade() -> None:
    op.drop_column('notification_preferences', 'notification_frequency')

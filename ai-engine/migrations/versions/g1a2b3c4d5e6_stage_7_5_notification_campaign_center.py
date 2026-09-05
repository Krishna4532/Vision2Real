"""stage 7 5 notification campaign center

Revision ID: g1a2b3c4d5e6
Revises: f0a1b2c3d4e5
Create Date: 2026-09-05 01:20:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'g1a2b3c4d5e6'
down_revision = 'f0a1b2c3d4e5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create campaigns table
    op.create_table(
        'campaigns',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('audience', sa.String(length=50), nullable=False, server_default='ALL_FOUNDERS'),
        sa.Column('target_founder_ids', sa.JSON(), nullable=True),
        sa.Column('channels', sa.JSON(), nullable=False, server_default='["IN_APP"]'),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('deep_link', sa.String(length=512), nullable=False, server_default='/founder/dashboard'),
        sa.Column('action_label', sa.String(length=100), nullable=False, server_default='View Details'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='DRAFT'),
        sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('stats_sent', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('stats_delivered', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('stats_failed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('stats_read', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('stats_clicked', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('extra_metadata', sa.JSON(), nullable=False, server_default='{}'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_campaigns_id'), 'campaigns', ['id'], unique=False)
    op.create_index(op.f('ix_campaigns_status'), 'campaigns', ['status'], unique=False)

    # 2. Create campaign_delivery_logs table
    op.create_table(
        'campaign_delivery_logs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('campaign_id', sa.String(length=36), nullable=False),
        sa.Column('founder_id', sa.String(length=36), nullable=False),
        sa.Column('channel', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='PENDING'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('delivered_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('clicked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['founder_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_campaign_delivery_logs_id'), 'campaign_delivery_logs', ['id'], unique=False)
    op.create_index(op.f('ix_campaign_delivery_logs_campaign_id'), 'campaign_delivery_logs', ['campaign_id'], unique=False)
    op.create_index(op.f('ix_campaign_delivery_logs_founder_id'), 'campaign_delivery_logs', ['founder_id'], unique=False)
    op.create_index(op.f('ix_campaign_delivery_logs_status'), 'campaign_delivery_logs', ['status'], unique=False)

    # 3. Create notification_templates table
    op.create_table(
        'notification_templates',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('subject', sa.String(length=255), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('deep_link', sa.String(length=512), nullable=False, server_default='/founder/dashboard'),
        sa.Column('action_label', sa.String(length=100), nullable=False, server_default='View Details'),
        sa.Column('default_channels', sa.JSON(), nullable=False, server_default='["IN_APP"]'),
        sa.Column('variables', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_notification_templates_id'), 'notification_templates', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_notification_templates_id'), table_name='notification_templates')
    op.drop_table('notification_templates')

    op.drop_index(op.f('ix_campaign_delivery_logs_status'), table_name='campaign_delivery_logs')
    op.drop_index(op.f('ix_campaign_delivery_logs_founder_id'), table_name='campaign_delivery_logs')
    op.drop_index(op.f('ix_campaign_delivery_logs_campaign_id'), table_name='campaign_delivery_logs')
    op.drop_index(op.f('ix_campaign_delivery_logs_id'), table_name='campaign_delivery_logs')
    op.drop_table('campaign_delivery_logs')

    op.drop_index(op.f('ix_campaigns_status'), table_name='campaigns')
    op.drop_index(op.f('ix_campaigns_id'), table_name='campaigns')
    op.drop_table('campaigns')

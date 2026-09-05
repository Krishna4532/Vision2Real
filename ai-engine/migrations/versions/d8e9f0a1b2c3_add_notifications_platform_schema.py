"""add notifications platform schema

Revision ID: d8e9f0a1b2c3
Revises: c7d8e9f0a1b3
Create Date: 2026-09-04 02:50:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd8e9f0a1b2c3'
down_revision = 'c7d8e9f0a1b3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create notifications table
    op.create_table(
        'notifications',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('founder_id', sa.String(length=36), nullable=False),
        sa.Column('notification_type', sa.String(length=100), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('deep_link', sa.String(length=512), nullable=False, server_default='/founder/notifications'),
        sa.Column('action_label', sa.String(length=100), nullable=False, server_default='View Details'),
        sa.Column('priority', sa.String(length=20), nullable=False, server_default='NORMAL'),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='ACTIVE'),
        sa.Column('source_module', sa.String(length=100), nullable=True),
        sa.Column('source_record_id', sa.String(length=36), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_dismissed', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('dismissed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('extra_metadata', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['founder_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_notifications_id'), 'notifications', ['id'], unique=False)
    op.create_index(op.f('ix_notifications_founder_id'), 'notifications', ['founder_id'], unique=False)
    op.create_index(op.f('ix_notifications_notification_type'), 'notifications', ['notification_type'], unique=False)
    op.create_index(op.f('ix_notifications_category'), 'notifications', ['category'], unique=False)
    op.create_index(op.f('ix_notifications_priority'), 'notifications', ['priority'], unique=False)
    op.create_index(op.f('ix_notifications_status'), 'notifications', ['status'], unique=False)
    op.create_index(op.f('ix_notifications_is_read'), 'notifications', ['is_read'], unique=False)
    op.create_index(op.f('ix_notifications_is_dismissed'), 'notifications', ['is_dismissed'], unique=False)
    op.create_index(op.f('ix_notifications_expires_at'), 'notifications', ['expires_at'], unique=False)
    op.create_index(op.f('ix_notifications_created_at'), 'notifications', ['created_at'], unique=False)
    op.create_index('ix_notifications_founder_unread', 'notifications', ['founder_id', 'is_read', 'is_dismissed', 'created_at'], unique=False)
    op.create_index('ix_notifications_founder_cat', 'notifications', ['founder_id', 'category', 'is_dismissed', 'created_at'], unique=False)

    # 2. Create notification_preferences table
    op.create_table(
        'notification_preferences',
        sa.Column('founder_id', sa.String(length=36), nullable=False),
        sa.Column('browser_push_enabled', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('email_enabled', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('validation_notifications', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('sprint_notifications', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('build_notifications', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('marketing_notifications', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('system_notifications', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('quiet_hours_enabled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('quiet_hours_start', sa.String(length=5), nullable=False, server_default='22:00'),
        sa.Column('quiet_hours_end', sa.String(length=5), nullable=False, server_default='08:00'),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['founder_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('founder_id')
    )

    # 3. Create push_subscriptions table
    op.create_table(
        'push_subscriptions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('founder_id', sa.String(length=36), nullable=False),
        sa.Column('endpoint', sa.Text(), nullable=False),
        sa.Column('p256dh_key', sa.Text(), nullable=False),
        sa.Column('auth_key', sa.Text(), nullable=False),
        sa.Column('user_agent', sa.String(length=512), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['founder_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('endpoint')
    )
    op.create_index(op.f('ix_push_subscriptions_id'), 'push_subscriptions', ['id'], unique=False)
    op.create_index(op.f('ix_push_subscriptions_founder_id'), 'push_subscriptions', ['founder_id'], unique=False)
    op.create_index(op.f('ix_push_subscriptions_endpoint'), 'push_subscriptions', ['endpoint'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_push_subscriptions_endpoint'), table_name='push_subscriptions')
    op.drop_index(op.f('ix_push_subscriptions_founder_id'), table_name='push_subscriptions')
    op.drop_index(op.f('ix_push_subscriptions_id'), table_name='push_subscriptions')
    op.drop_table('push_subscriptions')

    op.drop_table('notification_preferences')

    op.drop_index('ix_notifications_founder_cat', table_name='notifications')
    op.drop_index('ix_notifications_founder_unread', table_name='notifications')
    op.drop_index(op.f('ix_notifications_created_at'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_expires_at'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_is_dismissed'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_is_read'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_status'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_priority'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_category'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_notification_type'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_founder_id'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_id'), table_name='notifications')
    op.drop_table('notifications')

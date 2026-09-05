"""sync reality sprint schema

Revision ID: 63df14cce4af
Revises: b7c8d9e0f1a2
Create Date: 2026-09-03 02:52:52.652030

Forward-only idempotent synchronization migration.
Brings any existing PostgreSQL or SQLite schema into alignment with the current SQLAlchemy
RealitySprint and RealitySprintAttachment ORM models using runtime inspection.
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '63df14cce4af'
down_revision = 'b7c8d9e0f1a2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    is_sqlite = conn.dialect.name == 'sqlite'

    # ── reality_sprints ────────────────────────────────────────────────────────
    if "reality_sprints" in tables:
        cols = {c["name"] for c in inspector.get_columns("reality_sprints")}
        indexes = {i["name"] for i in inspector.get_indexes("reality_sprints")}

        # 1. Rename metadata_json -> extra_metadata if legacy column exists
        if "metadata_json" in cols and "extra_metadata" not in cols:
            op.alter_column('reality_sprints', 'metadata_json', new_column_name='extra_metadata')
        elif "extra_metadata" not in cols:
            op.add_column(
                'reality_sprints',
                sa.Column('extra_metadata', sa.JSON(), nullable=False, server_default='{}'),
            )

        # 2. Add missing scalar columns
        if "execution_mode" not in cols:
            op.add_column(
                'reality_sprints',
                sa.Column('execution_mode', sa.String(50), nullable=False, server_default='v1'),
            )
        if "version" not in cols:
            op.add_column(
                'reality_sprints',
                sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
            )
        if "is_archived" not in cols:
            op.add_column(
                'reality_sprints',
                sa.Column('is_archived', sa.Boolean(), nullable=False, server_default=sa.false()),
            )

        # 3. Add V2 reference ID placeholders
        if "project_id" not in cols:
            op.add_column('reality_sprints', sa.Column('project_id', sa.String(36), nullable=True))
        if "workspace_id" not in cols:
            op.add_column('reality_sprints', sa.Column('workspace_id', sa.String(36), nullable=True))
        if "roadmap_id" not in cols:
            op.add_column('reality_sprints', sa.Column('roadmap_id', sa.String(36), nullable=True))

        # 4. Add lifecycle timestamp columns
        if "submitted_at" not in cols:
            op.add_column('reality_sprints', sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=True))
        if "review_started_at" not in cols:
            op.add_column('reality_sprints', sa.Column('review_started_at', sa.DateTime(timezone=True), nullable=True))
        if "accepted_at" not in cols:
            op.add_column('reality_sprints', sa.Column('accepted_at', sa.DateTime(timezone=True), nullable=True))
        if "scheduled_at" not in cols:
            op.add_column('reality_sprints', sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=True))
        if "started_at" not in cols:
            op.add_column('reality_sprints', sa.Column('started_at', sa.DateTime(timezone=True), nullable=True))
        if "completed_at" not in cols:
            op.add_column('reality_sprints', sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True))
        if "cancelled_at" not in cols:
            op.add_column('reality_sprints', sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True))

        # 5. Add missing indexes
        if "ix_reality_sprints_is_archived" not in indexes:
            op.create_index('ix_reality_sprints_is_archived', 'reality_sprints', ['is_archived'])
        if "ix_reality_sprints_created_at" not in indexes:
            op.create_index('ix_reality_sprints_created_at', 'reality_sprints', ['created_at'])
        if "ix_reality_sprints_updated_at" not in indexes:
            op.create_index('ix_reality_sprints_updated_at', 'reality_sprints', ['updated_at'])
        if "ix_reality_sprints_founder_archive" not in indexes:
            op.create_index(
                'ix_reality_sprints_founder_archive',
                'reality_sprints',
                ['founder_id', 'is_archived', 'status'],
            )

    # ── reality_sprint_attachments ─────────────────────────────────────────────
    if "reality_sprint_attachments" in tables:
        att_cols = {c["name"] for c in inspector.get_columns("reality_sprint_attachments")}
        att_indexes = {i["name"] for i in inspector.get_indexes("reality_sprint_attachments")}

        # 6. Rename sprint_id -> reality_sprint_id if legacy column exists
        if "sprint_id" in att_cols and "reality_sprint_id" not in att_cols:
            if is_sqlite:
                with op.batch_alter_table("reality_sprint_attachments") as batch_op:
                    batch_op.alter_column("sprint_id", new_column_name="reality_sprint_id")
            else:
                fks = inspector.get_foreign_keys("reality_sprint_attachments")
                for fk in fks:
                    if "sprint_id" in fk.get("constrained_columns", []):
                        op.drop_constraint(fk["name"], "reality_sprint_attachments", type_="foreignkey")
                if "ix_reality_sprint_attachments_sprint_id" in att_indexes:
                    op.drop_index('ix_reality_sprint_attachments_sprint_id', table_name='reality_sprint_attachments')
                op.alter_column('reality_sprint_attachments', 'sprint_id', new_column_name='reality_sprint_id')
                op.create_index(
                    'ix_reality_sprint_attachments_reality_sprint_id',
                    'reality_sprint_attachments',
                    ['reality_sprint_id'],
                )
                op.create_foreign_key(
                    'reality_sprint_attachments_reality_sprint_id_fkey',
                    'reality_sprint_attachments',
                    'reality_sprints',
                    ['reality_sprint_id'],
                    ['id'],
                    ondelete='CASCADE',
                )

        # 7. Rename uploaded_at -> created_at if legacy column exists
        if "uploaded_at" in att_cols and "created_at" not in att_cols:
            op.alter_column('reality_sprint_attachments', 'uploaded_at', new_column_name='created_at')
        elif "created_at" not in att_cols:
            op.add_column('reality_sprint_attachments', sa.Column('created_at', sa.DateTime(timezone=True), nullable=False))

        # 8. Add missing original_filename column
        if "original_filename" not in att_cols:
            op.add_column(
                'reality_sprint_attachments',
                sa.Column('original_filename', sa.String(255), nullable=False, server_default=''),
            )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    # Idempotent safe downgrade: if rolling back to b7c8d9e0f1a2,
    # b7c8d9e0f1a2 itself defines the full canonical schema or drops the tables.
    # No destructive assumptions made.
    pass

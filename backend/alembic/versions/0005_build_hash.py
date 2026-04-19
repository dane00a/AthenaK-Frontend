"""build source_hash + reused_from

Revision ID: 0005_build_hash
Revises: 0004_retention
Create Date: 2026-04-19

"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "0005_build_hash"
down_revision = "0004_retention"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("builds") as batch:
        batch.add_column(sa.Column("source_hash", sa.String(length=64), nullable=True))
        batch.add_column(sa.Column("reused_from", sa.Integer(), nullable=True))
        batch.create_index("ix_builds_source_hash", ["source_hash"])


def downgrade() -> None:
    with op.batch_alter_table("builds") as batch:
        batch.drop_index("ix_builds_source_hash")
        batch.drop_column("reused_from")
        batch.drop_column("source_hash")

"""build diagnostics column

Revision ID: 0003_build_diagnostics
Revises: 0001_initial
Create Date: 2026-04-19

"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "0003_build_diagnostics"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("builds") as batch:
        batch.add_column(
            sa.Column("diagnostics", sa.JSON(), nullable=False, server_default="[]")
        )


def downgrade() -> None:
    with op.batch_alter_table("builds") as batch:
        batch.drop_column("diagnostics")

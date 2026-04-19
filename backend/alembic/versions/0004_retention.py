"""project retention_policy column

Revision ID: 0004_retention
Revises: 0003_build_diagnostics
Create Date: 2026-04-19

"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "0004_retention"
down_revision = "0003_build_diagnostics"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("projects") as batch:
        batch.add_column(
            sa.Column(
                "retention_policy",
                sa.JSON(),
                nullable=False,
                server_default='{"kind": "never"}',
            )
        )


def downgrade() -> None:
    with op.batch_alter_table("projects") as batch:
        batch.drop_column("retention_policy")

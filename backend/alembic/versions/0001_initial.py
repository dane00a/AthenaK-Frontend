"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-04-19

"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None

_BUILD_STATUS = sa.Enum("queued", "running", "success", "failed", "cancelled", name="buildstatus")
_RUN_STATUS = sa.Enum("queued", "running", "success", "failed", "cancelled", name="runstatus")


def upgrade() -> None:
    op.create_table(
        "projects",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("slug", sa.String(length=200), nullable=False, unique=True, index=True),
        sa.Column("physics_module", sa.String(length=32), nullable=False, server_default="hydro"),
        sa.Column("athenak_ref", sa.String(length=200), nullable=False, server_default="main"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table(
        "problem_files",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "project_id",
            sa.Integer(),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            unique=True,
        ),
        sa.Column(
            "filename",
            sa.String(length=200),
            nullable=False,
            server_default="user_problem.cpp",
        ),
        sa.Column("content", sa.Text(), nullable=False, server_default=""),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table(
        "input_files",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "project_id",
            sa.Integer(),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            index=True,
        ),
        sa.Column("filename", sa.String(length=200), nullable=False),
        sa.Column("content", sa.Text(), nullable=False, server_default=""),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table(
        "builds",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "project_id",
            sa.Integer(),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            index=True,
        ),
        sa.Column("status", _BUILD_STATUS, nullable=False, server_default="queued"),
        sa.Column("cmake_flags", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("log_path", sa.String(length=500)),
        sa.Column("binary_path", sa.String(length=500)),
        sa.Column("error", sa.Text()),
        sa.Column("started_at", sa.DateTime()),
        sa.Column("finished_at", sa.DateTime()),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table(
        "runs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "build_id",
            sa.Integer(),
            sa.ForeignKey("builds.id", ondelete="CASCADE"),
            index=True,
        ),
        sa.Column(
            "input_file_id",
            sa.Integer(),
            sa.ForeignKey("input_files.id", ondelete="RESTRICT"),
        ),
        sa.Column("status", _RUN_STATUS, nullable=False, server_default="queued"),
        sa.Column("pid", sa.Integer()),
        sa.Column("log_path", sa.String(length=500)),
        sa.Column("output_dir", sa.String(length=500)),
        sa.Column("exit_code", sa.Integer()),
        sa.Column("error", sa.Text()),
        sa.Column("started_at", sa.DateTime()),
        sa.Column("finished_at", sa.DateTime()),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("runs")
    op.drop_table("builds")
    op.drop_table("input_files")
    op.drop_table("problem_files")
    op.drop_table("projects")
    _RUN_STATUS.drop(op.get_bind(), checkfirst=True)
    _BUILD_STATUS.drop(op.get_bind(), checkfirst=True)

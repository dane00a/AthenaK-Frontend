# ADR 0003 — SQLite for dev, Postgres for prod

**Status:** Accepted.

## Context

Metadata (projects, files as text, build/run rows) needs a relational store. A researcher running the app on a laptop shouldn't have to run a database server. A shared HPC deployment eventually needs concurrent writers and row-level locking that SQLite can't provide.

## Decision

- Default `DATABASE_URL=sqlite:///./athenak.db`. Zero-config, single file, fits the "laptop install" use case.
- Every query written against SQLAlchemy 2.x Core/ORM goes through the dialect layer, so swapping to Postgres is a `DATABASE_URL` change + `alembic upgrade head`.
- Migrations are Postgres-safe — we use `op.batch_alter_table` for column adds/drops so SQLite migrations also execute cleanly.

## Consequences

- `SessionLocal` uses `check_same_thread=False` because Celery and FastAPI share a process during dev. That's SQLite-specific and a no-op for Postgres.
- The alembic env (`backend/alembic/env.py`) imports `app.models` so every model registers before autogen. Keep it that way.
- Tests use `sqlite://` StaticPool in-memory; the harness pins `SessionLocal` to that engine via `backend/tests/conftest.py::session_factory`.

## Alternatives considered

- **Postgres only.** Clean, but excludes the "one-liner on a laptop" install story that this project is shaped around.
- **DuckDB.** Analytical workloads are attractive, but transactional OLTP (our shape) isn't DuckDB's sweet spot.

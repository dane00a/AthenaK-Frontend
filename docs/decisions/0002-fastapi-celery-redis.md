# ADR 0002 — FastAPI + Celery + Redis backend

**Status:** Accepted.

## Context

We need an HTTP + WebSocket API plus a long-running task runner (builds take minutes, runs can take hours) with live log fan-out. Whatever we pick has to be deployable on a single workstation *or* an HPC login node with no Docker.

## Decision

- **FastAPI** for HTTP + WebSocket endpoints. Pydantic v2 throughout.
- **Celery** for out-of-request long tasks (builds, runs, retention sweeps).
- **Redis** as both Celery broker and the pub/sub substrate for live log streams (`build:<id>`, `run:<id>` channels).

## Consequences

- The FastAPI process and the Celery worker share the same Python codebase, so they import the same `services/` modules. No IPC boilerplate.
- Celery can run in *eager* mode in tests (`task_always_eager=True`) so API tests stay synchronous — no broker needed in CI. See `backend/tests/conftest.py`.
- `/api/ready` (ADR-adjacent) must verify both DB and Redis so the probe matches reality.
- A production deploy still fits on one box: `uvicorn` + `celery worker` + `redis-server` + SQLite (or Postgres). No Kubernetes required.

## Alternatives considered

- **Pure asyncio with `asyncio.create_subprocess_exec`** (no Celery). Simpler dep tree, but hard to cancel long jobs from a different request context, and log fan-out would need its own channel.
- **`arq` or `rq`** instead of Celery. Lighter, but Celery's eager-mode test support is a significant DX win for this project's shape.

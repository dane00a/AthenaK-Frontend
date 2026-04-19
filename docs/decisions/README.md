# Architecture Decision Records (ADRs)

Short, permanent records of choices that shape the codebase. Each ADR is a single file with four sections: **Context**, **Decision**, **Consequences**, **Alternatives considered**.

New ADRs must be numbered sequentially and must not rewrite history — supersede instead (add a "Superseded by ADR-XXXX" line at the top of the old one).

| # | Title | Status |
|---|---|---|
| 0001 | [Trust-mode local sandboxing](./0001-trust-mode-sandboxing.md) | Accepted |
| 0002 | [FastAPI + Celery + Redis backend](./0002-fastapi-celery-redis.md) | Accepted |
| 0003 | [SQLite for dev, Postgres for prod](./0003-sqlite-dev-postgres-prod.md) | Accepted |
| 0004 | [Per-project pluggable compute (Transport × Scheduler)](./0004-pluggable-compute.md) | Accepted |
| 0005 | [Slurm is an orthogonal, optional Scheduler](./0005-slurm-optional.md) | Accepted |
| 0006 | [HMAC-signed session cookie over JWT](./0006-hmac-cookie-over-jwt.md) | Accepted |
| 0007 | [`ccache` is opt-in via PATH detection](./0007-ccache-path-detection.md) | Accepted |
| 0008 | [Retention policy is per-project, not global](./0008-per-project-retention.md) | Accepted |
| 0009 | [User-region markers preserve hand-edits in generated C++](./0009-user-region-markers.md) | Accepted |
| 0010 | [On-disk log + Redis fan-out for live streams](./0010-log-file-plus-redis.md) | Accepted |

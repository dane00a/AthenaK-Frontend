# ADR 0008 — Retention policy is per-project, not global

**Status:** Accepted.

## Context

`workspaces/<slug>/runs/` grows without bound. We need a way to prune old runs. A global policy ("keep 10 runs per project") would be simple but wrong: some projects are exploratory (safe to prune aggressively); others are archival (never delete).

## Decision

- `Project.retention_policy: JSON` with two shapes:
  - `{"kind": "never"}` — default, no auto-pruning.
  - `{"kind": "keep_last_n", "n": N}` — keep the N newest run directories.
- The active run is always protected (via `protect_run_id=` in `services.storage.apply_retention`).
- Pruning happens after every run, regardless of status. Failed runs count toward the cap — users can still see the log.
- Only the on-disk run directory is removed; the DB row stays (so run history and metrics aren't lost).

## Consequences

- Users get per-project control. An "archive" project and a "throwaway parameter sweep" can coexist.
- We emit an `outputs_purged` flag on the Run row eventually (TODO) so the UI can render "outputs purged" instead of "files missing".
- The background job is *inline* after each run — no new worker needed.

## Alternatives considered

- **Global env-var policy.** Rejected — retention wants project granularity.
- **Cron-style sweeper task.** Fine, but adds a new Celery beat schedule for zero benefit over the inline-after-run approach.
- **Purge by age instead of count.** Useful later; the schema accepts adding a new `kind` without migration.

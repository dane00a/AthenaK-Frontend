# ADR 0010 — On-disk log + Redis fan-out for live streams

**Status:** Accepted.

## Context

Live log streaming has two competing needs:
1. A reader that connects mid-stream must catch up on what already happened.
2. Every subsequent line must arrive in real time.

A pure pub/sub channel satisfies (2) but drops history; a pure tail-a-file loop satisfies (1) but polls.

## Decision

Every line from `builder.build` / `runner.run_simulation` is both:
1. **Appended to a per-build/run log file** under `$ATHENAK_CACHE_DIR/workspaces/<slug>/logs/build-<id>.log` / `run-<id>.log` — this is the durable transcript.
2. **Published to a Redis channel** `build:<id>` / `run:<id>` for live fan-out.

The WebSocket handler (`app/api/ws.py`) first *replays* the log file top-to-bottom, then subscribes to the Redis channel. Late joiners see everything.

## Consequences

- Reconnects are seamless. The frontend can reload an in-flight build tab without losing history.
- The log file is the source of truth. Redis is ephemeral.
- Compiler-diagnostic parsing (`services/diagnostics.parse_log`) runs *after* the build against the on-disk file. It never depends on Redis.
- If Redis is down mid-run we lose live streaming but not the final transcript.

## Alternatives considered

- **Store log lines in the DB.** Billions of rows for a long turbulence run. Rejected.
- **Redis-only with a ring buffer of the last N lines.** Loses early lines on long builds; awkward replay semantics.
- **Server-sent events instead of WebSockets.** Fine; we already needed bidirectional channels elsewhere (future: interactive controls?), so WebSockets stay.

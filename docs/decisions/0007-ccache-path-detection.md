# ADR 0007 — `ccache` is opt-in via PATH detection

**Status:** Accepted.

## Context

`ccache` gives a 5–10× rebuild speedup on fresh clones and when projects share a compiler. Forcing a `ccache` dep would break installs on machines without it.

## Decision

`services/builder.py` calls `shutil.which("ccache")` before each configure. If present, it appends `-DCMAKE_CXX_COMPILER_LAUNCHER=ccache -DCMAKE_C_COMPILER_LAUNCHER=ccache` to the cmake invocation. A user-supplied launcher flag wins.

## Consequences

- No configuration knob for this — it "just works" when ccache is installed.
- The Docker builder image (`backend/Dockerfile`) installs ccache. Anyone running natively gets it the moment they `brew install ccache` / `apt install ccache`.
- Tests cover both branches (present + absent) so we don't accidentally hard-require it.

## Alternatives considered

- **Explicit `USE_CCACHE=1` env knob.** Extra config for no benefit over autodetect.
- **Always require ccache.** Breaks laptop installs where it's not on PATH.

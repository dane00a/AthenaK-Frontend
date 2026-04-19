# AthenaK-Frontend

A browser-based frontend for [AthenaK](https://github.com/IAS-Astrophysics/athenak) — the Kokkos-based astrophysical MHD/GR code. Write problem generators with a wizard + editor, edit `.athinput` files with a form, compile, run, and visualize — all from the browser.

> **Status:** scaffolding. See [`CLAUDE.md`](./CLAUDE.md) for architecture, conventions, and the milestone roadmap. The long-form design doc lives at `/root/.claude/plans/analyze-this-repository-and-squishy-yao.md`.

## What it does

- **Problem wizard → C++.** Pick a physics module, initial condition, and hooks; get a compliant `src/pgen/` file. Edit freely in Monaco (with AthenaK-specific completions, hovers, and region folding).
- **Input editor.** Structured form for `.athinput` blocks (`<mesh>`, `<time>`, `<hydro>`, …) with a raw-text Monaco pane for the escape hatch.
- **Compile.** `cmake -DPROBLEM=user_problem …` with live build log (xterm.js).
- **Run.** Launch the built binary; stream stdout; collect outputs.
- **Visualize.** `.hst` / `.tab` → line plots (Plotly).
- **Plug-and-play compute.** Local by default. **SSH** and — independently — **Slurm** are opt-in per-project along two orthogonal axes (Transport × Scheduler). You can SSH into a cluster and run commands directly (no Slurm required), or add Slurm on top to queue simulations while keeping builds fast on the login node. Design: [`docs/HPC-SSH.md`](./docs/HPC-SSH.md).

AthenaK's source tree is never modified — your problem file is staged into `src/pgen/` only for the duration of a build and removed immediately after, whether the build happens locally or on a remote cluster.

## Quick start

```bash
cp .env.example .env
./scripts/bootstrap_athenak.sh    # clones AthenaK into ~/.athenak-frontend/upstream/athenak
make install
make dev
# open http://localhost:5173
```

Prerequisites: Python 3.11+, Node 20+, Docker (for the Redis container), a C++17 compiler, CMake ≥ 3.16, and Git.

## Tech stack

FastAPI + Celery + Redis · React 18 + Vite + TypeScript · Tailwind + shadcn/ui · Monaco · xterm.js · Plotly · SQLite (dev) · paramiko (SSH, planned).

## Where data lives

- **Metadata** (projects, problem files, inputs, build/run rows): SQLite at `backend/athenak.db`.
- **Bytes** (CMake artifacts, the `athena` binary, `.hst`/`.tab`/`.bin`/`.athdf` outputs, logs): under `$ATHENAK_CACHE_DIR` (default `~/.athenak-frontend/`) — or on the remote cluster for SSH-backed projects. Simulation outputs land in `$ATHENAK_CACHE_DIR/workspaces/<slug>/runs/<run_id>/` because AthenaK is launched with that directory as its `cwd`.

See `CLAUDE.md §4a` for the full layout.

## Dev commands

| Command | Purpose |
|---|---|
| `make dev` | Run redis + backend + celery + frontend with reload |
| `make test` | `pytest` + `vitest` + `tsc --noEmit` |
| `make lint` | `ruff` + `eslint` |
| `make fmt` | `ruff format` + `prettier --write` |
| `make migrate` | `alembic upgrade head` |

See `CLAUDE.md` for the full reference.

# CLAUDE.md — AthenaK-Frontend

This file is the entry point for AI assistants (and humans) working in this repository. Read it end-to-end before making changes.

## 1. What this repo is

AthenaK-Frontend is a **non-invasive web layer on top of [AthenaK](https://github.com/IAS-Astrophysics/athenak)** — the Kokkos-based successor to Athena++. It lets a user:

1. Author AthenaK problem generators (the C++ files that normally live in `athenak/src/pgen/`) through a browser wizard + Monaco editor instead of hand-writing boilerplate.
2. Author / edit `.athinput` simulation input files through a structured form UI (with a raw-text escape hatch).
3. Compile AthenaK into a user-specific binary (`cmake -DPROBLEM=user_problem …`) and watch the build log stream live.
4. Launch the resulting binary as a simulation run, stream stdout/stderr, and collect output files.
5. Visualize the outputs (`.hst`, `.tab` in v1; `.athdf`/`.bin` later).

**Hard invariant: we do not modify AthenaK's source tree.** AthenaK's own extension point — dropping a `pgen` file into `src/pgen/` and selecting it with `-DPROBLEM=<name>` — is the only coupling. Everything else (workspaces, builds, runs, outputs) lives outside the AthenaK clone.

## 2. Tech stack (locked in)

| Layer | Choice |
|---|---|
| Backend | FastAPI (Python 3.11), Uvicorn |
| Task queue | Celery + Redis |
| DB | SQLAlchemy 2.x + SQLite (local dev), Alembic migrations |
| Templating | Jinja2 (for the C++ problem template) |
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Code editor | Monaco Editor (`@monaco-editor/react`) |
| Terminal pane | xterm.js |
| Plots | Plotly.js |
| Server-state | TanStack Query v5 |
| UI-state | Zustand |
| Testing | pytest (backend), Vitest + Testing Library (frontend) |
| Dev orchestration | docker-compose (redis only by default) + `make` targets |

**Decisions already made (do not relitigate without asking the user):**

- Sandboxing model is **trust / single-user local dev** — no Docker-per-build. Arbitrary C++ will be compiled and executed on the host.
- GPU (CUDA/ROCm) is **opt-in build flags** toggled in the UI, never a source-tree modification. CPU is the default.
- Scope is the **full feature set**: editor + build + run + visualize.
- **Compute is pluggable.** Each project carries a `compute_kind` (`local` today; `ssh` and `ssh+slurm` planned) and a `compute_config` JSON. `services/builder.py`, `services/runner.py`, and `services/outputs.py` are to be refactored behind a `ComputeTarget` ABC so the local path is just the first implementation. **Full design and roadmap: [`docs/HPC-SSH.md`](./docs/HPC-SSH.md).** Do not add HPC features without reading it.

## 3. Repository layout

```
AthenaK-Frontend/
├── CLAUDE.md                        # you are here
├── README.md                        # user-facing overview + quick start
├── Makefile                         # top-level dev commands (`make dev`, `make test`, ...)
├── docker-compose.yml               # redis (+ optional backend/frontend) for dev
├── .env.example                     # copy to .env for local dev
├── .gitignore
├── scripts/
│   └── bootstrap_athenak.sh         # one-shot clone of IAS-Astrophysics/athenak + submodules
├── backend/                         # FastAPI service
│   ├── pyproject.toml
│   ├── alembic.ini
│   ├── alembic/versions/
│   ├── app/
│   │   ├── main.py                  # FastAPI entry + CORS + routers + lifespan
│   │   ├── config.py                # Pydantic Settings (env-driven)
│   │   ├── db.py                    # engine + SessionLocal + get_db dep
│   │   ├── models/                  # SQLAlchemy models
│   │   │   ├── __init__.py
│   │   │   ├── project.py
│   │   │   ├── problem_file.py
│   │   │   ├── input_file.py
│   │   │   ├── build.py
│   │   │   └── run.py
│   │   ├── schemas/                 # Pydantic request/response models
│   │   ├── api/                     # route modules
│   │   │   ├── projects.py
│   │   │   ├── problems.py
│   │   │   ├── inputs.py
│   │   │   ├── builds.py
│   │   │   ├── runs.py
│   │   │   ├── outputs.py
│   │   │   └── ws.py                # WebSocket endpoints for log streams
│   │   ├── services/                # business logic (no FastAPI deps)
│   │   │   ├── compute/             # pluggable compute targets (local, ssh, ssh+slurm)
│   │   │   │   ├── base.py          # ComputeTarget / Transport / Executor ABCs
│   │   │   │   ├── local.py         # the current subprocess-based flow
│   │   │   │   ├── ssh.py           # paramiko-based (planned, see docs/HPC-SSH.md)
│   │   │   │   └── ssh_slurm.py     # sbatch variant (planned)
│   │   │   ├── athenak_repo.py      # clone/update upstream; locate pgen dir
│   │   │   ├── workspace.py         # per-project workspace layout
│   │   │   ├── builder.py           # cmake + cmake --build wrapper (uses ComputeTarget)
│   │   │   ├── runner.py            # Popen + log tailing
│   │   │   ├── templates.py         # Jinja2 C++ generator
│   │   │   ├── athinput.py          # parse/serialize .athinput files
│   │   │   └── outputs.py           # parse .hst / .tab into JSON
│   │   └── workers/
│   │       ├── celery_app.py
│   │       └── tasks.py             # build_project, run_simulation
│   ├── templates/
│   │   └── user_problem.cpp.j2      # canonical C++ problem-generator template
│   └── tests/
├── frontend/                        # Vite + React + TypeScript
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── postcss.config.cjs
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── router.tsx
│       ├── lib/
│       │   ├── api.ts               # typed fetch wrapper (REST)
│       │   ├── ws.ts                # WebSocket wrapper for log streams
│       │   └── queryClient.ts
│       ├── components/
│       │   ├── ui/                  # shadcn-generated primitives
│       │   └── layout/              # AppShell, Sidebar, TopBar
│       ├── features/
│       │   ├── projects/            # list/create/settings
│       │   ├── problem-editor/      # Monaco + wizard (two-pane)
│       │   ├── input-editor/        # form + raw-text toggle
│       │   ├── builds/              # live cmake/make log, status
│       │   ├── runs/                # launch form, stdout, history
│       │   └── visualize/           # .hst/.tab plots
│       └── schemas/
│           ├── athinput.ts          # canonical block/field catalog
│           └── pgen-wizard.ts       # wizard field catalog (drives codegen)
└── .github/workflows/
    ├── backend.yml                  # pytest + ruff
    └── frontend.yml                 # vitest + tsc + eslint
```

## 4. How AthenaK is integrated (non-invasive contract)

The upstream AthenaK clone lives **outside** this repo, under `$ATHENAK_CACHE_DIR` (default `~/.athenak-frontend/`):

```
~/.athenak-frontend/
├── upstream/athenak/                 # single shared clone (git submodules included)
└── workspaces/<project-slug>/
    ├── build/                        # CMake build dir, one per project
    ├── inputs/<name>.athinput
    └── runs/<run-id>/                # cwd for each simulation; outputs land here
```

The **only** mutation performed on the upstream tree is:

1. `services/builder.py` acquires a per-clone file lock.
2. It copies the current project's `ProblemFile.content` to `upstream/athenak/src/pgen/user_problem.cpp`.
3. It runs `cmake -S upstream/athenak -B workspaces/<slug>/build -DPROBLEM=user_problem …` and `cmake --build …`.
4. On finish (success or failure), it deletes `src/pgen/user_problem.cpp` and releases the lock.

Builds for different projects are serialized on the shared upstream clone (via file lock) but each has its own `build/` directory, so incremental compilation works per-project.

`services/athenak_repo.py` owns the bootstrap/update lifecycle. First call clones with `--recurse-submodules` to the ref recorded on the project (`Project.athenak_ref`, defaults to `main`); later calls fast-forward or skip.

## 4a. Data & storage layout (where every byte lives)

Two stores: **metadata in SQLite**, **bytes on the filesystem** under
`$ATHENAK_CACHE_DIR` (default `~/.athenak-frontend`). Nothing lives inside
the git repo.

### SQLite (metadata only)

File: `backend/athenak.db` (configurable via `DATABASE_URL`).

| Table | Key columns | What it owns |
|---|---|---|
| `projects` | id, slug, name, physics_module, athenak_ref | Project identity. |
| `problem_files` | project_id (unique), filename, content | Full C++ source as a TEXT blob. |
| `input_files` | project_id, filename, content | Full `.athinput` source as TEXT. |
| `builds` | project_id, status, cmake_flags (JSON), binary_path, log_path | Build lifecycle + pointers. |
| `runs` | build_id, input_file_id, status, pid, output_dir, log_path, exit_code | Run lifecycle + pointers. |

Deleting a project cascades to its problem file, inputs, builds, and runs.
Deleting a build cascades to its runs. On-disk artifacts are **not** deleted
automatically (intentional — outputs are often the valuable part). A future
`DELETE /api/projects/{id}?purge=1` can nuke the workspace dir too.

### Filesystem (the actual bytes)

```
$ATHENAK_CACHE_DIR/
├── upstream.lock                          # filelock held by builder
├── upstream/athenak/                      # single shared AthenaK clone
│   └── src/pgen/user_problem.cpp          # transient: staged during build, removed after
└── workspaces/<project-slug>/
    ├── build/                             # CMake build dir (per-project, persistent cache)
    │   └── src/athena                     # <-- recorded in builds.binary_path
    ├── inputs/                            # reserved for future on-disk input copies
    ├── logs/
    │   ├── build-<build_id>.log           # append-only full transcript
    │   └── run-<run_id>.log
    └── runs/<run_id>/                     # cwd for the simulation; OUTPUT FILES LAND HERE
        ├── input.athinput                 # copy of the input at launch time
        ├── <basename>.hst                 # history file (AthenaK's <output> block)
        ├── <basename>.tab                 # 1D tab dumps (per-time-step)
        ├── <basename>.bin                 # binary dumps
        ├── <basename>.athdf / .rst        # HDF5 dumps / restart files
        └── …
```

### How output files get there

1. `POST /api/builds/{id}/runs` enqueues `workers.tasks.run_simulation`.
2. The task creates `workspaces/<slug>/runs/<run_id>/` and writes
   `input.athinput` into it.
3. `services/runner.run_simulation` launches the built binary with
   **`cwd=runs/<run_id>`** and `-i input.athinput`. AthenaK writes all
   `<output>`-block products relative to its cwd, so they land in that
   directory.
4. `Run.output_dir` is set to that path on the DB row.
5. `runner.list_outputs(run_dir)` globs for `*.hst`, `*.tab`, `*.bin`,
   `*.athdf`, `*.rst` when the frontend calls `GET /api/runs/{id}/outputs`.
6. `GET /api/runs/{id}/outputs/{name}` streams the raw file back;
   `/series` parses `.hst` / `.tab` into JSON columns/rows via
   `services/outputs.parse_hst`.

### Logs — two places, deliberately

Every line of `cmake`/`make`/`athena` stdout is **both** appended to the
per-build/run log file under `logs/` **and** published to the Redis channel
`build:<id>` / `run:<id>`. A WebSocket client connecting to
`/ws/builds/{id}` or `/ws/runs/{id}` receives the historical transcript from
disk first, then the live Redis stream — so reload-during-a-build works
without gaps. The on-disk log is the source of truth; Redis is the fan-out.

### Retention / cleanup

- `make clean` drops the SQLite DB and in-repo build artefacts. It does
  **not** touch `$ATHENAK_CACHE_DIR`.
- To wipe everything, remove `~/.athenak-frontend/` and re-run
  `./scripts/bootstrap_athenak.sh`.
- Output files accumulate per run; prune `workspaces/<slug>/runs/` by hand
  for now.

## 4b. Compute targets (plug-and-play: local, SSH, SSH+Slurm)

**See [`docs/HPC-SSH.md`](./docs/HPC-SSH.md) for the full design, roadmap (J0–J6), and open questions. Summary only here.**

Every project pins a **compute target**:

| Kind | What it is | Status |
|---|---|---|
| `local` | `subprocess.Popen` on the backend host. Current code path. | **Shipped** — the entire existing flow is this kind. |
| `ssh` | Paramiko-based. Stage files over SFTP, run `cmake`/`make`/`athena` via `exec_command` with a configurable `shell_prelude` (typically `module load …`), stream stdout back line-by-line. | **Planned** (J2–J3 in the roadmap). |
| `ssh+slurm` | Extends `ssh` by wrapping each command in an `sbatch --wait` job; tails the Slurm `--output=` log via SFTP for live streaming. | **Planned** (J6). |

The `Project` model will gain two columns (Alembic migration `0002_compute_target.py` planned):

- `compute_kind: str` — one of `local`, `ssh`, `ssh+slurm`. Default `local`.
- `compute_config: JSON` — discriminated by `compute_kind`. For `ssh`: `host`, `port`, `user`, `key_path`, `remote_cache_dir`, `shell_prelude: list[str]`. For `ssh+slurm`: adds `scheduler: {kind, partition, account, time, gres, …}`.

`services/{builder,runner,outputs}.py` will be refactored behind a `ComputeTarget` ABC with a `Transport` (file ops) + `Executor` (command streaming) split. The local path becomes the first `ComputeTarget` implementation. The UI and REST surface don't change — log streaming over WebSockets keeps the same replay-then-subscribe contract; output download endpoints stream via SFTP for remote runs.

Credentials policy (same doc, §6): keys on disk, paths in DB, passphrases held in an in-memory 1h-TTL keyring after one-time `POST /api/compute/{project_id}/unlock`. A `POST /api/compute/{project_id}/probe` endpoint returns a connection check (`echo ok && uname -a`) for the "Test connection" button in the New Project dialog.

**Do not touch any SSH-related code paths without re-reading `docs/HPC-SSH.md` first.** The document locks the abstraction so future work (Slurm, Kerberos, bastion/ProxyJump) slots in without churning the existing services.

## 5. Backend architecture

### 5.1 Data model

```
Project(id, name, slug UNIQUE, physics_module, athenak_ref,
        compute_kind, compute_config JSON,          # see §4b
        created_at, updated_at)
ProblemFile(id, project_id FK, filename, content TEXT, updated_at)
InputFile(id, project_id FK, filename, content TEXT, updated_at)
Build(id, project_id FK, status, cmake_flags JSON, log_path, binary_path, started_at, finished_at, error TEXT)
Run(id, build_id FK, input_file_id FK, status, pid, log_path, output_dir, started_at, finished_at, exit_code, error TEXT)
```

`status` is a string enum: `queued | running | success | failed | cancelled`. `binary_path` and `output_dir` are **absolute paths in whatever filesystem the project's compute target owns** — local for `local`, remote for `ssh`.

### 5.2 Build pipeline (`workers/tasks.build_project`)

The task resolves the project's `ComputeTarget` first; every filesystem and process operation below goes through it, so the same prose describes the local and SSH flows.

1. `compute = get_compute(project)`; `compute.ensure_bootstrapped()` (no-op for `local`; clones AthenaK on first use for `ssh`).
2. Mark `Build.status = running`; open the **local** `log_path` for append.
3. Under the upstream lock (filelock for `local`, remote `flock` for `ssh`), `compute.transport.upload_text(pgen_dir/"user_problem.cpp", problem.content)`.
4. `compute.executor.run_streaming(["cmake", "-S", upstream, "-B", build_dir, "-DPROBLEM=user_problem", …], cwd=project_dir, shell_prelude=config.shell_prelude)` for configure.
5. Same for `cmake --build build_dir -j$(nproc)`.
6. Each `on_line` callback appends to the local `log_path` **and** publishes to Redis `build:<id>`.
7. On success, record `binary_path` = `build_dir/src/athena` (verify against upstream). For `ssh`, this is a remote path, used later by the runner on the same compute target.
8. **Always** unstage `user_problem.cpp` and release the lock (the invariant from §4 is identical on both sides).

### 5.3 Run pipeline (`workers/tasks.run_simulation`)

1. `compute = get_compute(project)`.
2. `compute.transport.upload_text(runs_dir/run_id/"input.athinput", inp.content)`.
3. `compute.executor.run_streaming([binary_path, "-i", "input.athinput"], cwd=runs_dir/run_id)`; each line gets written to the local log file and published to Redis `run:<id>`.
4. On exit, `compute.transport.listdir(runs_dir/run_id)` enumerates produced outputs (`.hst`, `.tab`, `.bin`, `.athdf`, `.rst`).

The routes in §5.5 don't change — `/api/runs/:id/outputs*` just calls `compute.transport.*` under the hood, streaming via SFTP for `ssh`.

### 5.4 WebSocket log streams

Endpoints: `GET /ws/builds/{id}`, `GET /ws/runs/{id}`.

Protocol:
1. On connect, the server **replays** the existing `log_path` from the top (so late joiners see the full transcript).
2. Then it subscribes to the Redis channel and forwards new lines until the client disconnects or the status becomes terminal.
3. Messages are JSON: `{"type":"line","stream":"stdout"|"stderr","text":"…"}` or `{"type":"status","status":"success"}`.

### 5.5 REST surface (summary)

```
GET    /api/projects                           POST /api/projects
GET    /api/projects/{id}                      PATCH /api/projects/{id}     DELETE /api/projects/{id}
GET    /api/projects/{id}/problem              PUT  /api/projects/{id}/problem
POST   /api/projects/{id}/problem/from-wizard  # body = wizard params; returns generated C++
GET    /api/projects/{id}/inputs               POST /api/projects/{id}/inputs
GET    /api/inputs/{id}                        PUT  /api/inputs/{id}         DELETE /api/inputs/{id}
POST   /api/projects/{id}/builds               # enqueue build (body = cmake_flags)
GET    /api/projects/{id}/builds               GET  /api/builds/{id}
POST   /api/builds/{id}/runs                   # body = {input_file_id}
GET    /api/runs/{id}
GET    /api/runs/{id}/outputs
GET    /api/runs/{id}/outputs/{name}           # streamed file download
GET    /api/runs/{id}/outputs/{name}/series    # parsed .hst/.tab → JSON

# Compute (planned — see docs/HPC-SSH.md)
POST   /api/compute/test                       # dry-run a compute_config without saving
POST   /api/compute/{project_id}/probe         # "echo ok && uname -a" sanity check
POST   /api/compute/{project_id}/unlock        # body = {passphrase}; caches decrypted key 1h
```

### 5.6 C++ template generator

`services/templates.py` renders `backend/templates/user_problem.cpp.j2`. The template produces a file conforming to AthenaK's real signature:

```cpp
void ProblemGenerator::UserProblem(ParameterInput *pin, const bool restart) { ... }
```

Wizard inputs drive conditionals in the template:

- `physics_module`: `hydro | mhd | srhydro | srmhd | grhydro | grmhd | radiation`
- `initial_condition`: `uniform | shock_tube | blast | gaussian | custom`
- `emit_par_for_loop`: bool (default true)
- `call_prim_to_cons`: bool (default true for hydro/mhd)
- `register_user_bcs` / `register_user_srcs` / `register_user_refinement` / `register_user_history`: bools

The template delimits user-editable zones with `// >>> user:<name>` / `// <<< user:<name>` markers so that "regenerate from wizard" preserves hand edits inside those zones.

## 6. Frontend architecture

### 6.1 Routes

- `/` — project list + "New project" dialog.
- `/projects/:id` — project shell with tabs: **Problem**, **Input**, **Build**, **Runs**, **Visualize**.

### 6.2 Problem Editor tab

Two-pane:
- **Left — Wizard:** form rendered from `schemas/pgen-wizard.ts`; "Generate" calls `POST /api/projects/{id}/problem/from-wizard`, which returns fresh C++.
- **Right — Monaco** with the `cpp` language, enhanced via `lib/monaco/athenak-cpp.ts`:
  - **Completions** (Snippet kind): `par_for`, `par_for_outer`, `pin->GetReal`, `pin->GetOrAddReal`, `pin->GetInteger`, `pin->GetString`, `CellCenterX`, `LeftEdgeX`, `PrimToCons (hydro)`, `PrimToCons (mhd)`, and a `user region` template that emits a round-trip-safe region pair.
  - **Hover docs** for `IDN`/`IVX`/`IVY`/`IVZ`/`IEN`/`IBX`/`IBY`/`IBZ`, `par_for`, `KOKKOS_LAMBDA`, `KOKKOS_INLINE_FUNCTION`, `CellCenterX`, `LeftEdgeX`, `PrimToCons`, `ParameterInput`, `MeshBlockPack`.
  - **Folding regions** for every `// >>> user:<name>` … `// <<< user:<name>` pair.
- **Keyboard**: `⌘/Ctrl+S` saves, `Alt+N` / `Alt+P` jump to the next/previous user region.
- **Chrome**: `components/EditorToolbar` (theme / font / word-wrap / minimap, persisted to `localStorage` via `lib/monaco/useEditorPrefs.ts`) and `components/EditorStatusBar` (line/col, line count, language, dirty indicator).

Regenerate preserves hand edits inside `// >>> user:<name>` regions.

### 6.3 Input Editor tab

Form driven by `schemas/athinput.ts`, which enumerates the canonical blocks and their typed fields: `<comment>`, `<job>`, `<mesh>`, `<mesh_refinement>`, `<meshblock>`, `<time>`, `<hydro>`, `<mhd>`, `<radiation>`, `<z4c>`, `<problem>`, `<output1..N>`. Raw-text toggle parses/serializes via `lib/athinput.ts` (mirrors `services/athinput.py`) so the two views stay in sync. Required-field validation runs client-side before POST. Double-clicking an input in the sidebar renames it.

The Raw pane uses a first-class Monaco language (`lib/monaco/athinput-language.ts`) with:
- Monarch tokens for block headers, kv lines, numbers, strings, `#` comments.
- `<` / `>` auto-closing pairs and `#` line comments.
- Completion snippets for every canonical block.

### 6.4 Build tab

"Build" button → POST → opens `/ws/builds/{id}` → xterm.js pane with ANSI colors. Status pill + compiler-diagnostic list (parsed from the log).

### 6.5 Runs tab

Launch form (choose input file + optional CLI flags) → POST → `/ws/runs/{id}`. Run history table with exit codes and durations; row click opens details.

### 6.6 Visualize tab

- `.hst` → Plotly line plots with column picker.
- `.tab` → line plots with a time-slider across dump indices.
- `.athdf` / `.bin` → download links in v1; heatmap viewer in v2.

### 6.7 Data flow

- Server state — TanStack Query. Cache keys are stable (`['projects']`, `['project', id]`, `['build', id]`, …).
- UI state — Zustand (active tab, editor split, wizard open/closed).
- Live logs — native `WebSocket` via `lib/ws.ts`.

## 7. Dev workflow

### 7.1 First-time setup

```bash
# clone this repo (you did that already)
cp .env.example .env
./scripts/bootstrap_athenak.sh          # clones upstream AthenaK into ~/.athenak-frontend/upstream/athenak
make install                            # backend (uv/pip) + frontend (pnpm) deps
make dev                                # redis (docker), uvicorn --reload, celery worker, vite
```

Open http://localhost:5173.

### 7.2 Common make targets

| Target | What it does |
|---|---|
| `make dev` | redis + backend + celery + frontend, all with reload |
| `make backend` | just uvicorn + celery |
| `make frontend` | just vite |
| `make test` | backend `pytest` + frontend `vitest` + `tsc --noEmit` |
| `make lint` | `ruff` + `eslint` |
| `make fmt` | `ruff format` + `prettier --write` |
| `make migrate` | `alembic upgrade head` |
| `make clean` | drop build artifacts (not the upstream AthenaK cache) |

### 7.3 Environment variables (`.env`)

```
ATHENAK_CACHE_DIR=~/.athenak-frontend
ATHENAK_GIT_URL=https://github.com/IAS-Astrophysics/athenak.git
DATABASE_URL=sqlite:///./backend/athenak.db
REDIS_URL=redis://localhost:6379/0
CORS_ORIGINS=http://localhost:5173
BUILD_JOBS=                 # blank = nproc
```

## 8. Conventions

### Code style

- **Python**: ruff (lint + format), type hints everywhere, Pydantic v2. No bare `except`. Services take primitives/DTOs, not FastAPI `Request`.
- **TypeScript**: strict mode on, no `any` that isn't explicitly `unknown`-narrowed, functional components only, colocate a component's types in the same file.
- **Commit messages**: imperative, scoped (`backend: add builder file-lock`, `frontend: wire up run WebSocket`).

### Naming

- DB tables are plural snake_case (`problem_files`).
- Python modules and FastAPI route files are singular (`project.py`, `build.py`).
- React component files are `PascalCase.tsx`; feature folders are `kebab-case`.
- The generated C++ file is always `user_problem.cpp` and the CMake flag is always `-DPROBLEM=user_problem`.

### Logs and errors

- Structured logging via `logging` + a JSON formatter in prod; plain text in dev.
- Every Celery task wraps its body in try/except that records `error` onto the DB row, then re-raises for Celery to mark the task failed.

### Tests

**Backend (pytest, 100+ tests).** Run `cd backend && pytest -q`.
- `test_projects_api.py` / `test_problems_api.py` / `test_inputs_api.py` — CRUD happy paths and 404s.
- `test_builds_api.py` — full build/run lifecycle with patched builder/runner and path-traversal guard on downloads.
- `test_builder_unit.py` — `_format_flags`, and the critical invariant that `user_problem.cpp` is *always* removed (success, configure-failure, thrown exception).
- `test_builder_integration.py` — real `cmake` against a miniature fake-AthenaK tree that mirrors the `PROBLEM=` cache-var selection; auto-skipped if `cmake`/`c++` aren't on PATH.
- `test_athenak_repo.py` — clone detection, `reset_pgen` idempotency, reentrant `upstream_lock`.
- `test_templates_matrix.py` — **parametrised over every `(physics module × initial condition)` pair** to catch template regressions.
- `test_athinput.py` / `test_athinput_edge_cases.py` — CRLF, inline comments, `=`-in-values, orphan kvs, empty blocks, repeated headers.
- `test_outputs_parser.py` — scientific notation, negatives, malformed rows filtered, empty / header-only files.
- `test_slug.py` — unicode stripping, fallback, incremental suffixing.
- `test_error_paths.py` — validation + 404s across every resource.

**Frontend (vitest, 30+ tests).** Run `cd frontend && pnpm vitest run`.
- `components/__tests__/StatusPill.test.tsx`
- `components/ui/__tests__/Modal.test.tsx` (Escape, overlay-click vs. inner-click)
- `features/problem-editor/__tests__/WizardForm.test.tsx`
- `features/input-editor/__tests__/InputForm.test.tsx`
- `features/projects/__tests__/ProjectList.test.tsx` (loading / empty / error / populated)
- `lib/__tests__/api.test.ts` (header shape, error surfacing, URL-encoding)
- `lib/__tests__/athinput.test.ts` (parse/serialize round-trip)
- `lib/monaco/__tests__/athenak-cpp.test.ts` (snippet coverage, hover docs)
- `schemas/__tests__/pgen-wizard.test.ts`

### Adding a new test

- Backend endpoint test: drop a `test_<resource>_api.py` alongside the others; `client` fixture from `conftest.py` swaps in an in-memory SQLite and makes Celery eager. If your route enqueues a task, patch `builder.build` / `runner.run_simulation` / `tasks._redis` exactly like `test_error_paths._fakes` does.
- Frontend component test: colocate under `__tests__/` next to the component. If it uses react-query, wrap in a fresh `QueryClientProvider`; if it uses routing hooks, wrap in `MemoryRouter`.

## 9. Gotchas and watch-outs

- **Builds are not isolated.** Because we chose the trust model, the upstream clone is shared. Always take the builder file lock before touching `src/pgen/`. A crash that leaves a stray `user_problem.cpp` must be cleaned up on the next builder startup (`services/athenak_repo.reset_pgen()`).
- **CMake output path.** `build/src/athena` is the expected binary location, but verify against the upstream CMakeLists.txt when wiring up `binary_path` — if it changes upstream, tests will catch it against the fake, but a one-line `glob` fallback is prudent.
- **WebSocket replay ordering.** Replay the historical log first, then subscribe. If you subscribe first and then replay, you can deliver lines out of order.
- **Monaco + Vite.** Monaco's workers need special Vite config (`worker: { format: 'es' }` + the `?worker` suffix). Use `@monaco-editor/react` to avoid hand-wiring loaders.
- **Editing the wizard schema.** `schemas/pgen-wizard.ts` (frontend) and `backend/app/services/templates.py` + `backend/templates/user_problem.cpp.j2` must stay in sync. When you add a wizard field, update all three in the same change.
- **The AthenaK source tree is sacred.** Never commit it as a vendored copy. Never edit it from this codebase's tests. Only `services/builder.py` touches it, and only transiently.
- **GPU.** We expose `Kokkos_ENABLE_CUDA` / `Kokkos_ENABLE_HIP` as opt-in cmake flags only. Don't assume the host has a GPU; default is CPU.
- **Compute target is per-project and authoritative.** Never hard-code `Popen` / `Path` into a new service — call the project's `ComputeTarget`. A function that bypasses `compute` is automatically SSH-broken even if it works locally.
- **Never log passphrases or private keys.** The `/api/compute/.../unlock` payload must be excluded from the access-log formatter; the in-memory keyring never serializes.
- **Remote paths vs. local paths.** After the refactor, `Build.binary_path` and `Run.output_dir` are strings whose filesystem is owned by the project's compute target. Do not `pathlib.Path(...).exists()` them directly; use `compute.transport.exists`.

## 10. Milestone roadmap

Local pipeline (shipped):

| # | Goal | Key files |
|---|---|---|
| M0 | Repo scaffold + this CLAUDE.md | (this file), Makefile, docker-compose.yml, .env.example |
| M1 | Backend core: FastAPI + models + CRUD | `backend/app/main.py`, `backend/app/models/*`, `backend/app/api/{projects,problems,inputs}.py` |
| M2 | Build pipeline with live logs | `services/athenak_repo.py`, `services/builder.py`, `workers/tasks.py`, `api/ws.py` |
| M3 | Run pipeline with live logs | `services/runner.py`, `api/runs.py` |
| M4 | Frontend shell + routing + API client | `frontend/src/{App,router,lib/api,lib/ws}.tsx` |
| M5 | Editors: Monaco + wizard, athinput form | `frontend/src/features/{problem-editor,input-editor}`, `backend/templates/user_problem.cpp.j2` |
| M6 | Build/Run UI with xterm.js | `frontend/src/features/{builds,runs}` |
| M7 | Visualization of `.hst`/`.tab` | `frontend/src/features/visualize`, `services/outputs.py` |

HPC / plug-n-play compute (planned — see [`docs/HPC-SSH.md`](./docs/HPC-SSH.md)):

| # | Goal | Key files |
|---|---|---|
| J0 | Introduce `ComputeTarget` ABC + `LocalCompute`; refactor services to use it (no behavioural change). | `backend/app/services/compute/{base,local}.py`, `services/{builder,runner,outputs}.py` |
| J1 | `compute_kind` + `compute_config` on `Project`; Alembic migration; API accepts them. | `backend/app/models/project.py`, `alembic/versions/0002_compute_target.py`, `api/projects.py` |
| J2 | `SshCompute` (paramiko) + `/api/compute/{id}/probe` + `/unlock`. Fake-SSH tests. | `services/compute/ssh.py`, `api/compute.py`, `tests/test_compute_ssh.py` |
| J3 | Remote bootstrap + remote upstream lock. End-to-end SSH build/run. | `services/compute/ssh.py`, `services/athenak_repo.py` (extracted helpers) |
| J4 | Frontend: compute field group in New Project dialog; compute chip in project header; passphrase banner. | `frontend/src/features/projects/NewProjectDialog.tsx`, new `features/compute/` |
| J5 | Output streaming via SFTP + optional `?mirror=1` local cache. | `api/outputs.py`, `services/compute/ssh.py` |
| J6 | `SshSlurmCompute` (sbatch + `--output=` tailing). | `services/compute/ssh_slurm.py` |

## 11. Verification (end-to-end acceptance)

1. `./scripts/bootstrap_athenak.sh` clones AthenaK successfully into `$ATHENAK_CACHE_DIR/upstream/athenak`.
2. `make dev` starts every service; http://localhost:5173 loads.
3. Create project → wizard preset "Sod shock tube" → generated C++ appears in Monaco.
4. Paste `inputs/hydro/sod.athinput` (from upstream) into the Input tab → form parses it cleanly.
5. Build tab → click Build → live log streams → completes with a recorded binary path.
6. Runs tab → pick the input → run streams to completion → `.hst` file appears in the outputs list.
7. Visualize tab → history plot renders with column picker.
8. `make test` passes; `make lint` passes.

## 12. Reference

- The long-form original implementation plan is at `/root/.claude/plans/analyze-this-repository-and-squishy-yao.md` (source of truth for the initial architecture).
- **HPC / SSH plug-and-play design lives at [`docs/HPC-SSH.md`](./docs/HPC-SSH.md)** — that's the source of truth for the compute abstraction and the J0–J6 roadmap. Read it before touching anything under `services/compute/` or `api/compute.py`.
- This CLAUDE.md is the everyday operating guide. Keep all three consistent when making significant changes.

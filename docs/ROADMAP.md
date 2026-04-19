# AthenaK-Frontend — Post-HPC Enhancement Roadmap

Short, actionable cards for the next 15 improvements. Any card can be picked up independently; none of them touches `services/compute/`, so they compose cleanly with the HPC/SSH J-milestones designed in [`HPC-SSH.md`](./HPC-SSH.md).

Prefix scheme: **M** = shipped local scaffold, **J** = HPC compute (planned), **K** = post-HPC enhancements (this doc).

## Card format

```
### Kn — Title  [effort · risk]
Why. Scope. Design. Files. Verify.
```

`effort` ∈ {XS, S, M, L}. `risk` ∈ {low, med, high}.

---

### K0 — Cancellable builds/runs  [S · low]

**Why.** One misclick on a 20-minute build (or a queued sbatch) is currently unrecoverable.
**Design.** `POST /api/builds/:id/cancel` and `POST /api/runs/:id/cancel`. In-process registry maps `build_id → subprocess.Popen` (local) or `paramiko.Channel` (ssh). Cancel sends SIGTERM, SIGKILL after 5s. For not-yet-started Celery tasks, `celery.control.revoke(task_id, terminate=True)`. Row transitions to `status=cancelled`.
**Files.** `backend/app/api/{builds,runs}.py`, new `backend/app/services/process_registry.py`, `backend/app/workers/tasks.py`, `frontend/src/features/{builds/BuildsPanel,runs/RunsPanel}.tsx`.
**Verify.** Fake slow builder sleeps 10s; test POSTs cancel, asserts `status=cancelled` within 1s and no stray child process. UI: Cancel button appears only for queued/running rows.

---

### K1 — Compiler diagnostics → Monaco markers  [M · low]

**Why.** Users scroll xterm logs hunting for `foo.cpp:42:5: error:`. Inline red squiggles cut iteration time.
**Design.** Regex `^(\S+):(\d+):(\d+):\s+(error|warning|note):\s+(.+)$` run over build log tail. Persist parsed list on `Build.diagnostics` (JSON). `ProblemEditor.tsx` fetches the latest build for the project and calls `monaco.editor.setModelMarkers`. Filter to markers whose `file` matches the staged `user_problem.cpp`.
**Files.** new `backend/app/services/diagnostics.py`, `backend/app/models/build.py` (+column), `backend/alembic/versions/0003_build_diagnostics.py`, `frontend/src/features/problem-editor/ProblemEditor.tsx`, new `frontend/src/lib/monaco/markers.ts`.
**Verify.** Unit test on a 50-line gcc fixture asserts parsed marker count/positions. Manual: introduce a typo in the wizard-generated source, save, build — red squiggle appears on the offending line with the gcc message in hover.

---

### K2 — Output retention + cleanup  [M · low]

**Why.** `workspaces/<slug>/runs/` grows without bound; no visibility and no reclaim path.
**Design.** Three pieces:
- `GET /api/projects/:id/storage` → total bytes and per-run bytes (walks the workspace via `compute.transport.listdir`).
- `DELETE /api/runs/:id?purge=1` → removes `runs/<id>/` via `compute.transport.remove`.
- `Project.retention_policy: JSON` — `{"kind":"keep_last_n","n":10}` or `{"kind":"never"}`. Background prune after each successful run.
**Files.** new `backend/app/api/storage.py`, `backend/app/models/project.py` (+column), `backend/alembic/versions/0004_retention.py`, `backend/app/workers/tasks.py` (prune hook), new `frontend/src/features/projects/StoragePanel.tsx` at route `/projects/:id/storage`.
**Verify.** Create project, run 12 times with `keep_last_n=10`, assert 10 run dirs remain and the DB rows for the pruned 2 are marked `purged=true` (not deleted, for audit).

---

### K3 — Project template gallery  [S · low]

**Why.** Cold start is "paste a pgen from somewhere". A "Start from Sod" button removes that friction.
**Design.** Static YAML catalog in `backend/templates/projects/*.yaml` with keys `{name, description, physics_module, wizard_state, pgen_source, inputs: [{filename, content}]}`. `GET /api/templates` returns the list. `NewProjectDialog.tsx` gains a "Start from template" dropdown; picking one populates the payload sent to `POST /api/projects`.
**Files.** new `backend/templates/projects/{sod,blast,kh2d,mhd_turb,z4c_gauge}.yaml`, new `backend/app/api/templates.py`, `backend/app/services/templates.py` (loader), `frontend/src/features/projects/NewProjectDialog.tsx`.
**Verify.** Pick "Sod", submit; assert generated project's problem file matches the template and the `sod.athinput` is attached. Build + run to completion against the fake AthenaK (K5) or real one locally.

---

### K4 — Build skip-if-unchanged  [S · low]

**Why.** Editing only `.athinput` and clicking Build currently rebuilds all of AthenaK.
**Design.** `Build.source_hash = sha256(problem_content || json(cmake_flags) || athenak_ref)`. On enqueue, look up the latest `status=success` build with the same hash on the same project; if found, create the new Build row pointing at that `binary_path` and set `status=success, reused_from=<id>` before the Celery task runs.
**Files.** `backend/app/models/build.py` (+`source_hash`, `reused_from`), `backend/alembic/versions/0005_build_hash.py`, `backend/app/workers/tasks.py` (short-circuit branch), `frontend/src/features/builds/BuildsPanel.tsx` (render "reused from #N" chip).
**Verify.** Build twice back-to-back without edits → second returns <500ms with `reused_from` set and the binary path equal to the first build's.

---

### K5 — End-to-end CI against real AthenaK  [M · med]

**Why.** Upstream AthenaK could move `src/athena`, rename `UserProblem`, or change the pgen signature. Without this, the user finds out, not us.
**Design.** Workflow `.github/workflows/e2e.yml`: label-gated (`[e2e]` on a PR) plus nightly cron. Steps:
1. Install deps.
2. `./scripts/bootstrap_athenak.sh` (real clone).
3. `make dev` in background.
4. `scripts/e2e.py` hits REST: create project from `sod` template, wait for build success, launch run, poll until `.hst` appears, fail on timeout.
5. On failure, upload build+run logs as artifacts.
**Files.** new `.github/workflows/e2e.yml`, new `scripts/e2e.py`, optional `scripts/e2e.sh` wrapper.
**Verify.** Green against upstream `main`. Deliberately rename `UserProblem` on a branch → red with a log artifact attached.

---

### K6 — Structured logging + `/api/ready`  [S · low]

**Why.** Prereq for non-loopback deployment. Today logs are unstructured and there's no readiness probe.
**Design.** `structlog` configured with JSON in prod, console in dev (gated on `APP_ENV`). Middleware assigns a `request_id` (UUID) and binds it into structlog's contextvars. `/api/health` stays shallow liveness. New `/api/ready` runs `SELECT 1` against the DB and `PING` against Redis; returns 503 on either failure.
**Files.** new `backend/app/logging.py`, `backend/app/main.py` (middleware + logging init), split `backend/app/api/health.py`.
**Verify.** Stop Redis → `/api/ready` → 503; restart → 200. `docker logs` in prod emits parseable JSON; dev logs stay human-readable.

---

### K7 — Optional auth flag  [M · med]

**Why.** Trust-model default is fine for loopback, unsafe for anything else. A single-user password gate is the minimum viable.
**Design.** `AUTH_ENABLED=true` + `ADMIN_PASSWORD_HASH` (bcrypt). `POST /api/auth/login` issues an HttpOnly, SameSite=Lax JWT cookie (1d). FastAPI dependency `require_user` attached globally when auth is on. WebSocket auth via the cookie (`websocket.cookies`). Frontend: `LoginPage.tsx` at `/login`, router redirects on 401.
**Files.** new `backend/app/auth.py`, new `backend/app/api/auth.py`, `backend/app/main.py` (middleware), new `frontend/src/features/auth/LoginPage.tsx`, `frontend/src/router.tsx`.
**Verify.** With `AUTH_ENABLED=false` all 101+34 tests pass unchanged. With it on: unauth `GET /api/projects` → 401; `/api/auth/login` with correct password → 200 + cookie; subsequent request → 200.

---

### K8 — Regenerate-preview diff  [S · low]

**Why.** "Generate from wizard" silently clobbers edits outside `>>> user:*` regions.
**Design.** `POST /api/projects/:id/problem/from-wizard?preview=1` returns `{content, base_content}` without saving. New `RegenPreview.tsx` renders a Monaco `DiffEditor` in a modal with Apply / Cancel. Apply reissues the non-preview POST.
**Files.** `backend/app/api/problems.py`, `frontend/src/features/problem-editor/ProblemEditor.tsx`, new `frontend/src/features/problem-editor/RegenPreview.tsx`.
**Verify.** Add a line outside a user region, click Generate → diff shows the line as a clobber; Cancel preserves it; Apply removes it.

---

### K9 — Multi-run comparison on Plotly  [S · low]

**Why.** Comparing two runs is the #1 analysis workflow; today requires manual file download.
**Design.** Visualize panel's run picker becomes multi-select (max 4). `SeriesChart.tsx` fetches `/series` for each run in parallel. Overlay traces get names `run #N · <col>` with a run-id-stable color. Shared x-axis; y-column checkbox list is the union across runs.
**Files.** `frontend/src/features/visualize/VisualizePanel.tsx`, `frontend/src/features/visualize/SeriesChart.tsx`.
**Verify.** Two runs with `.hst` picked → legend shows both run ids; toggling a column that exists only in one run renders only that trace.

---

### K10 — `.athdf` 2D heatmap viewer  [L · med]

**Why.** v1 exposes HDF5 dumps as download links only; 2D visualization is essential for MHD/GR users.
**Design.** `services/outputs_athdf.py` uses `h5py` to open the file, pick the variable, slice to 2D at the chosen axis + index, block-mean-downsample to ≤512×512, return `{x, y, z[][]}` JSON. Endpoint `GET /api/runs/:id/outputs/:name/field?var=rho&slice=z=0&t=<dump_idx>`. Frontend `HeatmapView.tsx` renders Plotly `Heatmap` with three pickers.
**Files.** new `backend/app/services/outputs_athdf.py`, `backend/app/api/outputs.py`, new `frontend/src/features/visualize/HeatmapView.tsx`, dispatch in `VisualizePanel.tsx`.
**Verify.** A real `.athdf` from an MHD turb run loads in <2s, pickers populate from the file's metadata, switching variable updates the heatmap.

---

### K11 — Command palette + global shortcuts  [S · low]

**Why.** Tab-switching and clicking is the default; keyboard-driven users expect more.
**Design.** `cmdk` library. Actions: navigate to each tab, New Project, Save (⌘S — already per-editor, also in the palette), Build (⌘B), Launch Run (⌘↵), Toggle Theme. Global `⌘K` listener in `App.tsx`.
**Files.** new `frontend/src/components/CommandPalette.tsx`, `frontend/src/App.tsx`, `frontend/package.json` (+`cmdk`).
**Verify.** `⌘K` opens palette; typing "build" filters; Enter navigates to the Build tab.

---

### K12 — `ccache` on the builder path  [XS · low]

**Why.** Free 5–10× rebuild speedup on fresh clones and across projects.
**Design.** `builder.py` checks `shutil.which("ccache")`; if present, appends `-DCMAKE_CXX_COMPILER_LAUNCHER=ccache -DCMAKE_C_COMPILER_LAUNCHER=ccache` to the configure step. `backend/Dockerfile` installs ccache.
**Files.** `backend/app/services/builder.py`, `backend/Dockerfile`, `CLAUDE.md §8` note.
**Verify.** Build twice; `ccache -s` shows hit rate climbing. Second build wall time drops noticeably.

---

### K13 — OpenAPI → typed TS client  [M · low]

**Why.** `frontend/src/lib/api.ts` is hand-maintained; types drift against Pydantic changes.
**Design.** Dev dep `openapi-typescript`. Script `pnpm gen:api` fetches `http://localhost:8000/openapi.json` and writes `frontend/src/lib/api-types.ts`. `api.ts` becomes a thin `request<Op>(op, body)` shell that reads path/method off the generated types. CI runs `gen:api` against a spawned backend to guarantee freshness.
**Files.** `frontend/package.json`, new `frontend/scripts/gen-api.ts`, rewrite of `frontend/src/lib/api.ts`.
**Verify.** Change a Pydantic field → regen → TS compile error at the caller; fix → green. All 34 vitest pass.

---

### K14 — Pre-commit hooks  [XS · low]

**Why.** Catch ruff/prettier/tsc before CI.
**Design.** `.pre-commit-config.yaml`: `ruff check --fix`, `ruff format`, `prettier --write` on `frontend/src`, and a local hook running `pnpm -C frontend tsc --noEmit`. Make target `make hooks` installs via `pipx run pre-commit install`.
**Files.** new `.pre-commit-config.yaml`, `Makefile`.
**Verify.** Commit a file with bad formatting → hook fixes it and blocks the commit for re-staging. Commit a TS error → hook blocks.

---

## Suggested execution order

Land foundations first (everything benefits), then user-visible wins, then larger pieces:

1. **K14** pre-commit hooks — 15 min
2. **K6** structured logging + `/api/ready`
3. **K0** cancellable builds/runs
4. **K3** project templates
5. **K1** compiler diagnostics → Monaco markers
6. **K2** retention + cleanup
7. **K12** ccache
8. **K4** build skip-if-unchanged
9. **K9** multi-run comparison
10. **K8** regenerate-preview diff
11. **K11** command palette
12. **K5** e2e CI (benefits from K3 existing)
13. **K13** OpenAPI client
14. **K7** auth flag (env-gated, off by default)
15. **K10** `.athdf` viewer (largest; ship last)

All cards are independent of the HPC J-milestones and independent of each other — pick by value-to-effort at the time.

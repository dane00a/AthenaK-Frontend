# AthenaK-Frontend — Setup from Scratch

This walkthrough takes a clean machine from nothing to **create a Sod shock tube project, compile AthenaK, run the simulation, and see the `.hst` history plot** in the browser.

If anything here doesn't match reality for your OS, please open an issue — the goal is a boring, first-time-works experience.

## 1. Prerequisites

Install these once. Version floors are what we test against; newer is fine.

| Tool | Version floor | Why |
|---|---|---|
| Python | 3.11+ | Backend runtime. `match`, `UTC`, modern typing. |
| Node.js | 20 LTS+ | Frontend + Vite toolchain. |
| `pnpm` | 9+ | Frontend package manager. |
| CMake | 3.16+ | Drives the AthenaK build. |
| A C++17 compiler | gcc 11+ or clang 14+ | Compiles AthenaK. |
| Git | any recent | Clones AthenaK + its submodules. |
| Docker | any recent | Runs Redis. (Or install Redis natively.) |
| `ccache` | optional | 5–10× rebuild speedup. Auto-detected. |

### Quick installers

**macOS (Homebrew):**
```bash
brew install python@3.11 node pnpm cmake git redis ccache
```

**Ubuntu / Debian:**
```bash
sudo apt update
sudo apt install -y python3.11 python3-pip nodejs build-essential cmake git ccache
npm install -g pnpm
# Redis: either run it via docker (see §4) or:
sudo apt install -y redis-server
```

**Fedora:**
```bash
sudo dnf install -y python3.11 nodejs gcc-c++ cmake git ccache
npm install -g pnpm
```

## 2. Clone this repo

```bash
git clone https://github.com/IAS-Astrophysics/athenak-frontend.git
# or whichever fork you're using
cd athenak-frontend
```

## 3. Clone & cache AthenaK

The bootstrap script clones [AthenaK](https://github.com/IAS-Astrophysics/athenak) (with its Kokkos submodule) into `$ATHENAK_CACHE_DIR` (default `~/.athenak-frontend/`). The backend needs this before the first build.

```bash
cp .env.example .env   # edit if you want a non-default cache dir
./scripts/bootstrap_athenak.sh
```

On success you'll see:
```
==> Cloning AthenaK from https://github.com/IAS-Astrophysics/athenak.git ...
==> Done. AthenaK is ready at: ~/.athenak-frontend/upstream/athenak
```

The script is idempotent — re-run it any time to fast-forward. It also cleans up a stray `user_problem.cpp` left behind by a crashed build (see §9.4 in `CLAUDE.md`).

## 4. Install dependencies

```bash
make install
```

Runs `pip install -e '.[dev]'` in `backend/` and `pnpm install` in `frontend/`. First run takes 1–3 minutes.

## 5. Start everything

```bash
make dev
```

This starts four things in parallel:
- `redis` via Docker (`docker-compose up -d redis`), exposing `:6379`
- `uvicorn app.main:app --reload` on `:8000`
- `celery -A app.workers.celery_app.celery worker` for build/run tasks
- `vite` on `:5173`

Open **http://localhost:5173**. You should see the empty project list.

If any of those fail to start, jump to §8 — troubleshooting.

## 6. Smoke test: Sod shock tube, top to bottom

1. **New project** → pick *"Sod shock tube"* from the template dropdown → Create.
2. You land on the Problem tab; a fully-populated `user_problem.cpp` is already there.
3. Switch to the **Input** tab. The `sod.athinput` file is pre-loaded.
4. **Build** tab → click **Build**. A live xterm pane shows CMake + compiler output. First build takes 2–8 minutes depending on CPU / ccache state. Subsequent builds with the same source + flags hit the cache and finish in <500 ms (look for the *"reused from #N"* chip).
5. **Runs** tab → select the successful build and the `sod.athinput` input → **Launch**. Run finishes in a few seconds.
6. **Visualize** tab → the latest `.hst` is auto-selected → you see a history plot with a column picker. Toggle `mass` / `1-E_tot` etc.

🎉 If all six steps work, your install is healthy.

## 7. What just ran, and where the bytes live

- **Metadata** (projects, files, build/run rows): SQLite at `backend/athenak.db`.
- **Build artifacts + binary**: `~/.athenak-frontend/workspaces/<slug>/build/`.
- **Simulation outputs** (`.hst`, `.tab`, `.bin`, `.athdf`): `~/.athenak-frontend/workspaces/<slug>/runs/<run_id>/`.
- **Logs**: `~/.athenak-frontend/workspaces/<slug>/logs/` (on-disk) + Redis channels `build:<id>` / `run:<id>` (live fan-out).

Full layout and cascade rules: `CLAUDE.md §4a`.

## 8. Troubleshooting

### 8.1 `make dev` exits immediately
Usually Redis didn't start. Check: `docker compose ps redis`. If it's not up, `docker compose up -d redis` manually, then re-run `make dev`. If you aren't using Docker, start redis-server natively on `localhost:6379`.

### 8.2 Build fails with `cmake: command not found`
Install CMake ≥ 3.16 (§1). Verify with `cmake --version`. If you installed it but `make dev` still can't find it, your shell env isn't propagating — open a new terminal.

### 8.3 Bootstrap fails behind a corporate proxy
Set `HTTPS_PROXY=http://…` in `.env` before running `scripts/bootstrap_athenak.sh`. Git uses the env-var proxy automatically.

### 8.4 `$ATHENAK_CACHE_DIR` permission errors
Default is `~/.athenak-frontend/`, owned by you. If you ran anything as root earlier, fix with `sudo chown -R "$USER" ~/.athenak-frontend`.

### 8.5 Port 5173 (or 8000) already in use
```bash
lsof -iTCP:5173 -sTCP:LISTEN   # find the offender
# or just change the port in frontend/vite.config.ts / backend's uvicorn line
```

### 8.6 Auth cookie not sticking in the browser
Happens when the frontend and backend aren't same-site. Either:
- Set `CORS_ORIGINS=http://localhost:5173` in `.env` (default), *and*
- Access the app at `http://localhost:5173` — not `127.0.0.1`.
Cross-site cookies need `SameSite=None; Secure` which only works over HTTPS. For prod see §10.

### 8.7 First build fails with `No such file or directory: src/pgen/user_problem.cpp`
A previous build crashed before unstaging. Run `./scripts/bootstrap_athenak.sh` — it cleans up.

### 8.8 `/api/ready` returns 503
Usually Redis is down. Restart it.

## 9. Environment variable reference

Every knob lives in `.env` (copied from `.env.example`). Defaults are tuned for loopback dev.

| Variable | Default | Purpose |
|---|---|---|
| `ATHENAK_CACHE_DIR` | `~/.athenak-frontend` | Where the upstream clone + per-project workspaces live. |
| `ATHENAK_GIT_URL` | `https://github.com/IAS-Astrophysics/athenak.git` | Override to a fork. |
| `ATHENAK_DEFAULT_REF` | `main` | Default pinned ref for new projects. |
| `DATABASE_URL` | `sqlite:///./athenak.db` | Postgres supported; see §10. |
| `REDIS_URL` | `redis://localhost:6379/0` | Broker + log fan-out. |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allow-list. |
| `BUILD_JOBS` | *(nproc)* | `cmake --build -j` setting. |
| `APP_ENV` | `dev` | Anything else → JSON logs. |
| `AUTH_ENABLED` | `false` | See §10.2. |
| `ADMIN_PASSWORD_HASH` | *(unset)* | Bcrypt hash — generate with `python -c "from app.auth import hash_password; print(hash_password('your password'))"`. |
| `AUTH_SECRET` | `dev-secret-change-me` | **Replace for prod.** HMAC key for the session cookie. |

## 10. Running in "prod-ish" mode

The defaults assume loopback. For anything exposed on a network:

### 10.1 Swap SQLite → Postgres
```bash
export DATABASE_URL=postgresql+psycopg://user:pass@host/athenak
cd backend && alembic upgrade head
```

### 10.2 Turn on auth
```bash
export AUTH_ENABLED=true
export AUTH_SECRET="$(python -c 'import secrets; print(secrets.token_urlsafe(32))')"
export ADMIN_PASSWORD_HASH="$(python -c "from app.auth import hash_password; print(hash_password('pick-a-strong-password'))")"
```
The login page lives at `/login`. Cookie is HttpOnly SameSite=Lax, 1-day TTL.

### 10.3 Reverse-proxy
Run Vite's `pnpm build && pnpm preview` OR serve `frontend/dist/` via nginx/Caddy. Proxy `/api/*` and `/ws/*` to uvicorn. Set `VITE_API_BASE_URL=/` and `VITE_WS_BASE_URL=/` before building so the frontend uses same-origin paths.

### 10.4 GPU builds
AthenaK uses Kokkos. In the project's **Build** tab, tick "CUDA" to pass `-DKokkos_ENABLE_CUDA=ON`. You'll need the CUDA toolkit installed on the backend host.

### 10.5 HPC / SSH / Slurm
Planned, not shipped. See `docs/HPC-SSH.md` for the full design (transport × scheduler orthogonal axes; Slurm is a strictly optional `Scheduler`).

## 11. Useful make targets

| Target | What it does |
|---|---|
| `make dev` | Everything, with reload. |
| `make backend` | just `uvicorn --reload` |
| `make worker` | just the Celery worker |
| `make frontend` | just Vite |
| `make test` | `pytest` + `vitest` + `tsc --noEmit` |
| `make lint` | `ruff check` + `eslint` |
| `make fmt` | `ruff format` + `prettier --write` |
| `make migrate` | `alembic upgrade head` |
| `make hooks` | install pre-commit hooks (see `.pre-commit-config.yaml`) |
| `make clean` | drop build artifacts + the SQLite DB (doesn't touch `$ATHENAK_CACHE_DIR`) |

## 12. Where to go next

- **Working on the code:** read `CLAUDE.md` — that's the architectural source of truth.
- **HPC / Slurm:** `docs/HPC-SSH.md`.
- **What's queued:** `docs/ROADMAP.md` (K-cards) and `docs/decisions/` (ADRs).
- **Adding a test:** `CLAUDE.md §8 "Tests"` has the inventory + a "how to add" note.

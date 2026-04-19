# HPC / SSH Compute Backend — Design Plan

> **Status:** design only. None of this is wired up yet. The current code path is `LocalTransport + NoScheduler` described in CLAUDE.md §4a. This doc locks the contract so implementation can proceed without further architectural debate.
>
> **Key property:** `Transport` (how we reach the host) and `Scheduler` (whether we wrap in a batch job) are **orthogonal**. Slurm is opt-in on any Transport and defaults to **runs only** — builds stay direct. SSH-without-Slurm is a first-class configuration.

## 1. Problem statement

The MVP assumes the backend can spawn `cmake`, `make`, and `athena` locally. That breaks on real HPC use:

- Login nodes frequently disallow long-running HTTP servers; admin policy pushes users into SSH-only workflows.
- GPU / big-memory resources live on compute nodes only reachable via a batch scheduler (Slurm, PBS, LSF) from the login node.
- Outputs are written to a parallel filesystem (`$SCRATCH`, `$WORK`) on the cluster, not the workstation where the UI is running.
- `module load …` is required before any compiler/CUDA is on `$PATH`.

**Requirement:** a single AthenaK-Frontend install must be able to drive *both* local builds/runs and remote clusters, switched per-project, without forks or deploy-time feature flags.

## 2. Design principles

1. **One contract, pluggable implementations.** All backend services (`builder`, `runner`, `outputs`) talk to a `ComputeTarget` abstraction. The existing local pipeline becomes `LocalTransport` + `NoScheduler`; the SSH pipeline becomes `SshTransport` + `NoScheduler`; batch scheduling is a separate `Scheduler` subclass applied on top.
2. **Transport and Scheduler are orthogonal. Slurm is opt-in.** A user who SSHs into a login or interactive node and runs commands directly is a first-class scenario (`scheduler.kind == "none"`). Slurm wraps an existing Transport; it never replaces one. By default it wraps **runs only** — builds stay direct so the edit-compile loop is fast — but a config flag promotes builds into the queue for clusters that forbid compilation on login nodes.
3. **Per-project selection.** The compute target is a property of the `Project`, not a global setting. Users can have one project building locally and another building on Frontera in the same instance.
4. **Sacred upstream invariant preserved.** The remote AthenaK clone is still read-mostly — the only mutation is transient staging of `user_problem.cpp`, exactly as in the local flow.
5. **No new data paths for the UI.** The frontend keeps calling `/api/builds`, `/api/runs`, `/api/runs/:id/outputs/:name` — the backend just does the right thing underneath. Log WebSockets keep the same replay-then-stream semantics.
6. **Credentials live on disk, not in the DB.** Private keys are referenced by path. Passphrases are never persisted; collected once per session via an unlock endpoint and held in an in-memory keyring.

## 3. Abstraction

Two orthogonal axes. `Transport` owns how bytes and commands reach a host; `Scheduler` optionally wraps an execution in a batch job. A `ComputeTarget` pairs one of each.

```python
# backend/app/services/compute/base.py
from abc import ABC, abstractmethod
from collections.abc import Callable, Iterable
from pathlib import Path, PurePosixPath

class Transport(ABC):
    """Filesystem + direct command execution on the target host."""

    @abstractmethod
    def upload_text(self, remote: PurePosixPath, content: str) -> None: ...
    @abstractmethod
    def upload_file(self, local: Path, remote: PurePosixPath) -> None: ...
    @abstractmethod
    def download_file(self, remote: PurePosixPath, local: Path) -> None: ...
    @abstractmethod
    def read_text(self, remote: PurePosixPath) -> str: ...
    @abstractmethod
    def open_stream(self, remote: PurePosixPath) -> Iterable[bytes]: ...
    @abstractmethod
    def listdir(self, remote: PurePosixPath) -> list["RemoteEntry"]: ...
    @abstractmethod
    def mkdir_p(self, remote: PurePosixPath) -> None: ...
    @abstractmethod
    def exists(self, remote: PurePosixPath) -> bool: ...
    @abstractmethod
    def remove(self, remote: PurePosixPath, missing_ok: bool = True) -> None: ...

    @abstractmethod
    def run_direct(
        self,
        argv: list[str],
        *,
        cwd: PurePosixPath,
        env: dict[str, str] | None = None,
        on_line: Callable[[str], None] | None = None,
        shell_prelude: list[str] | None = None,   # e.g. ["module load cmake"]
    ) -> int:
        """Direct exec — no scheduler. subprocess.Popen for local, exec_command for ssh."""

class Scheduler(ABC):
    """Optional wrapper that turns a direct exec into a scheduled job."""

    @abstractmethod
    def submit(
        self,
        transport: Transport,
        argv: list[str],
        *,
        cwd: PurePosixPath,
        env: dict[str, str] | None = None,
        on_line: Callable[[str], None] | None = None,
        shell_prelude: list[str] | None = None,
        resources: dict[str, object] | None = None,
    ) -> int: ...

class NoScheduler(Scheduler):
    """Default. Delegates straight to transport.run_direct — zero scheduler overhead."""
    def submit(self, transport, argv, **kw) -> int:
        return transport.run_direct(argv, **kw)

class ComputeTarget:
    """Carried by a project. Services call exec_for(phase, …) and never touch
    Transport / Scheduler directly."""

    transport: Transport
    scheduler: Scheduler                 # defaults to NoScheduler()
    scheduler_scope: frozenset[str]      # subset of {"build", "run"}; default frozenset({"run"})
    cache_dir: PurePosixPath             # remote analogue of ATHENAK_CACHE_DIR

    def exec_for(self, phase: str, argv: list[str], **kw) -> int:
        impl = self.scheduler if phase in self.scheduler_scope else NoScheduler()
        return impl.submit(self.transport, argv, **kw)

    def close(self) -> None: ...
```

`RemoteEntry` is a small dataclass `(name, size, is_dir, mtime)` — enough to replace `Path.glob` in `services/outputs.list_outputs`.

**Why two axes.** The old `compute_kind` enum forced a new string for every (transport, scheduler) pair and hid the fact that *SSH-without-Slurm is the common HPC workflow*. With orthogonality, we also get `local + slurm` (a workstation running `slurmd`) and any future PBS/LSF scheduler for free.

## 4. Implementations

### 4.1 `LocalTransport` (zero behavioural change)

Wraps `subprocess.Popen` and `pathlib`. Exists so services don't fork on transport kind — there's a single code path. Combined with `NoScheduler`, this is a byte-for-byte reproduction of today's pipeline.

### 4.2 `SshTransport`

- **Library:** `paramiko` (`SSHClient` + `SFTPClient`). Reasons: pure Python, no native libssh2 build, well-known.
- **Authentication:** key-based only in v1. Key path is in the project config. Passphrase flow in §6.
- **Connection reuse:** one `SSHClient` per `(host, user, key_path)` cached in the process for the lifetime of the Celery worker. On `close()`, drop.
- **run_direct:** `client.exec_command(" && ".join(shell_prelude + [shlex.join(argv)]), get_pty=False)`. Read `stdout.readline()` in a loop; buffer stderr into the same stream (merge like the local path). Exit code via `stdout.channel.recv_exit_status()`.
- **File ops:** `client.open_sftp()`. `mkdir_p` walks components and tolerates EEXIST. `open_stream` chunks through SFTP for log replay.
- **Timeouts & keepalive:** `client.get_transport().set_keepalive(30)` so firewalls don't drop idle control channels during long builds.

### 4.3 `NoScheduler` (default)

A one-liner: `submit(transport, argv, **kw) → transport.run_direct(argv, **kw)`. Carries no configuration and adds no overhead. Every project ships with this unless the user explicitly opts into a different scheduler.

### 4.4 `SlurmScheduler` (optional, composes with any `Transport`)

Takes a `Transport` and wraps it:

1. Writes a job script to `cache_dir/jobs/<uuid>.sh` via `transport.upload_text`. The script applies `shell_prelude`, `cd`s to `cwd`, and execs `argv`.
2. Runs `sbatch --wait --output=<log> --parsable <resources> <script>` through `transport.run_direct`. `--wait` blocks until the job terminates; `--parsable` returns just the job id for error messages.
3. In parallel, tails the `--output=<log>` file via `transport.open_stream`, publishing each new line to the same `on_line` callback used by the direct path.
4. Returns the Slurm job's exit code (0 on SUCCESS, non-zero otherwise).

Because it only interacts with `Transport`, the same `SlurmScheduler` works with `LocalTransport` (your workstation with `slurmd`) and `SshTransport` (any real cluster). No `services/builder.py` or `services/runner.py` changes required.

`SlurmScheduler` also implements a `probe_ok(transport) -> bool` method that runs `sbatch --test-only` to validate resources before accepting a config at `/api/compute/test` time.

## 5. Project data model

Add a single column to `projects`:

```python
compute_config: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
```

`compute_config` is a discriminated-union Pydantic model with two nested blocks (`transport` + `scheduler`) and a scope list. `scheduler` defaults to `{"kind": "none"}` and `scheduler_scope` defaults to `["run"]` — so a blank config means "local, no scheduler", which matches today's behaviour exactly.

```python
# backend/app/schemas/compute.py (planned)
class LocalTransport(BaseModel):
    kind: Literal["local"] = "local"

class SshTransport(BaseModel):
    kind: Literal["ssh"]
    host: str
    user: str
    key_path: str
    port: int = 22
    remote_cache_dir: str
    shell_prelude: list[str] = []
    use_agent: bool = False

class NoSchedulerCfg(BaseModel):
    kind: Literal["none"] = "none"

class SlurmSchedulerCfg(BaseModel):
    kind: Literal["slurm"]
    partition: str
    account: str | None = None
    time: str = "01:00:00"
    gres: str | None = None
    ntasks: int = 1
    cpus_per_task: int | None = None
    extra_sbatch_lines: list[str] = []

class ComputeConfig(BaseModel):
    transport: Annotated[LocalTransport | SshTransport, Field(discriminator="kind")]
    scheduler: Annotated[NoSchedulerCfg | SlurmSchedulerCfg, Field(discriminator="kind")] = NoSchedulerCfg()
    scheduler_scope: list[Literal["build", "run"]] = ["run"]
```

Four example shapes the schema must accept:

```jsonc
// 1. Laptop / local dev — the default for every existing row.
{
  "transport": {"kind": "local"},
  "scheduler": {"kind": "none"}
}

// 2. SSH to a cluster, run commands directly on the login or interactive node.
//    NO SLURM — this is a first-class, common HPC workflow.
{
  "transport": {
    "kind": "ssh",
    "host": "frontera.tacc.utexas.edu",
    "port": 22,
    "user": "dane",
    "key_path": "~/.ssh/id_ed25519_tacc",
    "remote_cache_dir": "/scratch/dane/athenak-frontend",
    "shell_prelude": ["module load cmake gcc/11 cuda/12"]
  },
  "scheduler": {"kind": "none"}
}

// 3. SSH + Slurm, default scope (runs only). Builds stay direct on the login node —
//    fast edit-compile iteration, simulations go through the queue.
{
  "transport": {"kind": "ssh", /* …as above… */},
  "scheduler": {
    "kind": "slurm",
    "partition": "gpu",
    "account": "AST20027",
    "time": "01:00:00",
    "gres": "gpu:1",
    "ntasks": 1,
    "cpus_per_task": 8,
    "extra_sbatch_lines": ["--mail-type=END"]
  },
  "scheduler_scope": ["run"]
}

// 4. Same as 3 but the cluster forbids compilation on login nodes, so builds
//    also go through sbatch.
{
  "transport": {"kind": "ssh", /* … */},
  "scheduler": {"kind": "slurm", /* … */},
  "scheduler_scope": ["build", "run"]
}
```

A lightweight Alembic migration (`0002_compute_config.py`) adds the column with `server_default '{}'` so existing rows fall back to "local + no scheduler" transparently.

## 6. Credential handling

- **Keys:** referenced by absolute path on the backend host. Never ingested into the DB. We `stat` the file at save time and reject bad perms (`!= 0o600` for private keys) as a best-effort guard.
- **Passphrases:** collected via a new endpoint `POST /api/compute/{project_id}/unlock` that accepts `{ "passphrase": "..." }` and holds the loaded `paramiko.PKey` in an in-process `TTLCache` keyed by project id. Cache entries expire after 1h of inactivity. The passphrase itself is never stored, logged, or returned.
- **Agent forwarding:** if `SSH_AUTH_SOCK` is set on the backend host and the project config sets `"use_agent": true`, we ask the agent instead of reading the key from disk.
- **Connection test:** `POST /api/compute/{project_id}/probe` runs `echo ok && uname -a` and returns the exit code + first 10 lines of output. UI uses it as a sanity check at project creation time.

## 7. Remote filesystem layout

Exactly mirrors the local `$ATHENAK_CACHE_DIR` tree (see CLAUDE.md §4a) but rooted at `compute_config.remote_cache_dir`. No new semantics — the builder and runner just operate relative to `compute.cache_dir`:

```
{remote_cache_dir}/
├── upstream.lock                          # filelock, remote-side
├── upstream/athenak/                      # first bootstrap pulls this
│   └── src/pgen/user_problem.cpp          # transient, same invariant
└── workspaces/<project-slug>/
    ├── build/
    │   └── src/athena                     # Build.binary_path now points here
    ├── logs/
    │   └── run-<id>.log                   # written by the remote athena
    └── runs/<run_id>/                     # cwd for the binary; outputs land here
```

**Remote bootstrap:** because we can't ship `scripts/bootstrap_athenak.sh` to an unknown login node, the `ComputeTarget` exposes `ensure_bootstrapped()` which `SshTransport` implements as:

```python
def ensure_bootstrapped(self) -> None:
    if self.transport.exists(self.upstream_dir / ".git"): return
    self.transport.run_direct(
        ["git", "clone", "--recurse-submodules", ATHENAK_GIT_URL, str(self.upstream_dir)],
        cwd=self.cache_dir,
        shell_prelude=self.config.transport.shell_prelude,
    )
```

Bootstrap always uses `run_direct` (even when `scheduler.kind == "slurm"`) — cloning a repo doesn't belong in a batch job.

It's idempotent and safe to call at the start of every build.

## 8. Build flow over SSH (end-to-end)

1. Celery worker picks up `build_project(build_id)` (unchanged).
2. Task resolves `project.compute_config` → builds a `ComputeTarget` via `get_compute(project)`.
3. `compute.ensure_bootstrapped()` clones AthenaK on the remote if needed (no-op for `LocalTransport`).
4. **Upstream lock** is now a *remote* filelock: implemented as a `mkdir -p && flock` via a short shell helper we write to `cache_dir/.locks/upstream.lock`. Falls back to atomic `ln -s` for mountpoints that don't support `flock`.
5. `compute.transport.upload_text(...)` stages `user_problem.cpp` into `upstream/athenak/src/pgen/`.
6. `compute.exec_for("build", ["cmake", "-S", …, "-DPROBLEM=user_problem", …], …)`, then `compute.exec_for("build", ["cmake", "--build", …], …)`.
   - With the default `scheduler_scope == ["run"]` this dispatches through `NoScheduler` → `transport.run_direct`, so builds execute directly on the login node. Fast iteration.
   - With `scheduler_scope == ["build", "run"]` it dispatches through `SlurmScheduler.submit`, wrapping the cmake invocation in an sbatch job. `on_line` still fires line-by-line (tailed from the Slurm output log).
7. Success → `binary_path` is the remote path `workspaces/<slug>/build/src/athena`.
8. `finally:` — unstage `user_problem.cpp`, release the remote lock. Same invariant as local.

## 9. Run flow over SSH

1. Celery task resolves `compute = get_compute(project)`.
2. `compute.transport.upload_text(run_dir / "input.athinput", input_file.content)`.
3. `compute.exec_for("run", [binary_path, "-i", "input.athinput"], cwd=run_dir, shell_prelude=config.transport.shell_prelude)`.
   - `scheduler_scope` defaults to `["run"]`, so if the project has `scheduler.kind == "slurm"` this submits an sbatch job. If `scheduler.kind == "none"`, it executes directly over SSH.
4. `Run.output_dir` is a *remote* path. That's fine — `GET /api/runs/:id/outputs` iterates via `compute.transport.listdir`.

## 10. Output retrieval

The frontend contract is unchanged. On the backend:

- **`GET /api/runs/:id/outputs`** — `compute.transport.listdir(run.output_dir)` → filtered by known suffixes.
- **`GET /api/runs/:id/outputs/:name`** — stream via `Transport.open_stream`, response chunked. No full-file materialisation on the backend; we can serve multi-GB `.athdf` dumps.
- **`GET /api/runs/:id/outputs/:name/series`** — `.hst`/`.tab` are small (KB-MB); pull into memory via `Transport.read_text`, parse with the same `services/outputs` code, return JSON.
- **Optional caching** (later): a `?mirror=1` query that pulls the file to a local cache dir and subsequent requests serve from there. Not needed for v1.

## 11. Log streams over SSH

Two-place contract is preserved regardless of Transport or Scheduler:

- **On-disk transcript:** the backend keeps writing to its *local* `workspaces/<slug>/logs/<...>.log`. Every line arriving via the `on_line` callback is appended.
- **Redis fan-out:** unchanged.
- For `NoScheduler`, lines come directly from `transport.run_direct` (stdout of `subprocess.Popen` locally or `exec_command` over SSH).
- For `SlurmScheduler`, `sbatch --wait` is detached from stdout. The scheduler launches a background tailer that polls the `--output=<log>` file via `transport.open_stream` (SFTP for ssh transport, local file for local transport) and publishes each new line through the same `on_line` callback. Same replay-then-subscribe contract from the WebSocket's point of view.

## 12. Connection pooling & concurrency

- A process-level `ComputeRegistry` maps `project_id → ComputeTarget`. Celery workers look up their per-project target once per task.
- `SshTransport` keeps a single `SSHClient` per `(host, user, key_path)`, regardless of project count. Multiple projects on the same cluster share the connection.
- A keepalive thread pings every 30s. If the connection dies mid-build, we mark the build failed and surface a clear error (`ssh: connection lost after <seconds>; tail of log: …`).

## 13. Failure modes & user messaging

| Scenario | Detection | UX |
|---|---|---|
| Key file missing | `paramiko.RSAKey.from_private_key_file` raises | Config save rejected with the exact path |
| Wrong passphrase | `paramiko.PasswordRequiredException` | `401` from `/unlock`; UI prompts again |
| Host unreachable | Connect timeout 10s | `probe` returns `network unreachable` |
| Auth refused | `AuthenticationException` | `probe` surfaces which auth method was attempted |
| `module load` fails | non-zero exit from the prelude, detected before `cmake` runs | Build fails immediately; first ~20 lines of prelude stderr quoted |
| Connection drops mid-build | `recv_exit_status` raises `EOFError` | Build marked failed, last `N` lines of log preserved |
| Disk full on remote | `cmake --build` fails with ENOSPC | Build failed; link to "Clean workspace" action that SFTPs `rm -rf workspaces/<slug>` after confirmation |

## 14. UI surface changes

- **New project dialog:** two separate, orthogonal field groups.
  - **Where does this run?** — Transport picker: `Local` (default) or `SSH`. SSH reveals host / user / key-path / remote-cache-dir / shell-prelude.
  - **Submit jobs via a scheduler?** — Scheduler picker, *collapsed* by default so the common case (no scheduler) never forces the user to think about Slurm. Options: `None` (default) or `Slurm`. Slurm reveals partition / account / time / gres / ntasks / cpus-per-task, plus a "Submit via Slurm for: ☑ Runs ☐ Builds" checkbox group (controls `scheduler_scope`).
  - A **Probe** button POSTs `/api/compute/test` with the candidate config without saving anything. For `scheduler.kind == "slurm"` the probe also runs `sbatch --test-only` with the configured resources.
- **Project header:** a small chip next to the slug, format `transport · scheduler`. Examples: `local · direct`, `ssh frontera.tacc · direct`, `ssh frontera.tacc · slurm(gpu)`.
- **Build panel:** existing cmake-flag checkboxes (MPI/CUDA/Debug) stay. A muted caption under the Build button says "runs directly on login node" or "submits via Slurm" depending on whether `"build" ∈ scheduler_scope`.
- **Runs panel:** analogous caption; Slurm job ids surface in the run history row once assigned.
- **Outputs panel:** same file list and download links. For large files we link to `?mirror=1` so the user can pre-cache.
- **Compute settings page** (per project): edit key path / prelude, toggle scheduler scope, view last probe result.
- **Credentials banner:** if the SSH project needs a passphrase, a dismissible banner appears site-wide: "🔑 Unlock SSH key for project X" → inline form → calls `/unlock`.

## 15. Testing strategy

1. **Unit tests for Transport/Scheduler ABCs** via an in-memory `FakeTransport` (records commands + a dict-backed filesystem). Services are tested against the fake — same contract, zero network.
2. **`NoScheduler` regression test:** `submit(fake_transport, ["echo","hi"], …)` calls `run_direct` exactly once with identical kwargs. This is the guarantee that `local + none` is byte-for-byte identical to today's pipeline.
3. **`SlurmScheduler` tests:** exercise both scope combinations (`["run"]` vs `["build","run"]`) against `FakeTransport` and assert the emitted sbatch script and the log-tailing behaviour. `sbatch --test-only` covered by a separate probe test.
4. **`SshTransport` integration tests** use [`mockssh`](https://pypi.org/project/mockssh/) (or a tiny `paramiko.Transport` test server fixture) running on localhost:2222. Exercises auth, command streaming, SFTP upload/download, bootstrap.
5. **Lock semantics:** the remote-lock helper has its own test using two concurrent `FakeTransport` clients sharing the same simulated filesystem.
6. **Failure-mode tests:** patch paramiko methods to raise (`AuthenticationException`, `EOFError`, `SSHException`) and assert each surfaces the user-visible mapping from §13.
7. **UI test:** submitting the New Project form with the Scheduler section collapsed (default) produces `{"scheduler":{"kind":"none"}}` in the request body — the regression guard that Slurm is never accidentally required.

## 16. Milestones

| # | Scope | Rough commits |
|---|---|---|
| J0 | `ComputeTarget` + `Transport` + `Scheduler` ABCs. `LocalTransport` + `NoScheduler`. Services refactored to call `compute.exec_for(phase, …)`. No behavioural change. | 1 |
| J1 | Add `compute_config` JSON to `Project`; discriminated-union Pydantic validation; Alembic migration. API accepts it; UI still forces the default config. | 1 |
| J2 | `SshTransport` (paramiko) + `/api/compute/{id}/probe` + `/unlock` endpoints. Fake-SSH tests. | 1–2 |
| J3 | Remote bootstrap + remote upstream lock. Full build/run lifecycle over SSH passes end-to-end against a test VM using `NoScheduler`. | 1 |
| J4 | UI: two-group compute picker (Transport / Scheduler) in New Project dialog; compute chip in project header; passphrase banner. | 1 |
| J5 | Output streaming via SFTP + optional `?mirror=1` local cache. | 1 |
| J6 | `SlurmScheduler`: sbatch wrapper, `--output=` tailing via `transport.open_stream`, runs-only scope by default, opt-in build scope. | 1 |

**J3 is the "shippable HPC support" line** for users who don't need a batch scheduler — SSH with `NoScheduler` is a complete, self-contained story. J6 is a pure addition: the Scheduler ABC is present from J0, so `SlurmScheduler` drops in without touching Transport code or any service.

J0–J2 are the minimum to call it "plug-n-play". J3–J5 are what an actual HPC user needs day-to-day. J6 unlocks big-GPU runs but is entirely optional.

## 17. Open questions (flag before J2 starts)

- **Windows clients?** paramiko works, but key-path expansion and permission checks differ. Out of scope for v1 — assume Linux/macOS host running the backend.
- **X11 / TTY needs?** None for batch-style runs. Revisit if AthenaK adds an interactive debugger.
- **Multi-hop SSH / bastions?** Defer; add `ProxyCommand`/`proxy_jump` to `compute_config` when a user asks.
- **Rate-limiting on a shared SSHClient?** Currently one build at a time per project due to the upstream lock; cross-project concurrency inherits paramiko's thread-safety, which is per-channel. We'll add a small semaphore around `exec_command` if we see corruption in practice.
- **Kerberos/GSSAPI auth?** Paramiko supports it. Deferred behind an `auth_method` field in `compute_config` when there's a user who needs it.
- **`scheduler_scope` granularity.** Today it's project-level. If users start asking "submit *this specific* build via Slurm because it's a production rebuild", we'll promote it to a per-launch override on `POST /builds` and `POST /runs` without schema changes (add an optional `scheduler_scope` override field).
- **Other schedulers.** PBS, LSF, SGE each map cleanly onto the `Scheduler` ABC — add when a user needs them. No design work required now.

## 18. Reference

- Compute ABCs: `backend/app/services/compute/base.py` (`Transport`, `Scheduler`, `ComputeTarget`).
- Local transport: `backend/app/services/compute/local.py` (refactored from today's builder/runner internals).
- SSH transport: `backend/app/services/compute/ssh.py` (new, J2).
- Scheduler implementations: `backend/app/services/compute/scheduler.py` (`NoScheduler` in J0, `SlurmScheduler` in J6).
- Config schema: `backend/app/schemas/compute.py` (discriminated union).
- Registry / factory: `backend/app/services/compute/__init__.py` (`get_compute(project)`).
- Tests: `backend/tests/test_compute_*.py` (mirrors the module split).

# HPC / SSH Compute Backend — Design Plan

> **Status:** design only. None of this is wired up yet. The current code path is the `local` compute target described in CLAUDE.md §4a. This doc locks the contract so implementation can proceed without further architectural debate.

## 1. Problem statement

The MVP assumes the backend can spawn `cmake`, `make`, and `athena` locally. That breaks on real HPC use:

- Login nodes frequently disallow long-running HTTP servers; admin policy pushes users into SSH-only workflows.
- GPU / big-memory resources live on compute nodes only reachable via a batch scheduler (Slurm, PBS, LSF) from the login node.
- Outputs are written to a parallel filesystem (`$SCRATCH`, `$WORK`) on the cluster, not the workstation where the UI is running.
- `module load …` is required before any compiler/CUDA is on `$PATH`.

**Requirement:** a single AthenaK-Frontend install must be able to drive *both* local builds/runs and remote clusters, switched per-project, without forks or deploy-time feature flags.

## 2. Design principles

1. **One contract, pluggable implementations.** All backend services (`builder`, `runner`, `outputs`) talk to a `ComputeTarget` abstraction. The existing local pipeline becomes `LocalCompute`; the new SSH pipeline becomes `SshCompute`. A future `SshSlurmCompute` plugs in without touching services.
2. **Per-project selection.** The compute target is a property of the `Project`, not a global setting. Users can have one project building locally and another building on Frontera in the same instance.
3. **Sacred upstream invariant preserved.** The remote AthenaK clone is still read-mostly — the only mutation is transient staging of `user_problem.cpp`, exactly as in the local flow.
4. **No new data paths for the UI.** The frontend keeps calling `/api/builds`, `/api/runs`, `/api/runs/:id/outputs/:name` — the backend just does the right thing underneath. Log WebSockets keep the same replay-then-stream semantics.
5. **Credentials live on disk, not in the DB.** Private keys are referenced by path. Passphrases are never persisted; collected once per session via an unlock endpoint and held in an in-memory keyring.

## 3. Abstraction

Two small interfaces that decompose cleanly (so a future `SshSlurmCompute` only overrides `Executor`):

```python
# backend/app/services/compute/base.py
from abc import ABC, abstractmethod
from collections.abc import Iterable
from pathlib import PurePosixPath

class Transport(ABC):
    """Filesystem operations against the target host."""

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

class Executor(ABC):
    """Command execution against the target host."""

    @abstractmethod
    def run_streaming(
        self,
        argv: list[str],
        *,
        cwd: PurePosixPath,
        env: dict[str, str] | None = None,
        on_line: Callable[[str], None] | None = None,
        shell_prelude: list[str] | None = None,   # e.g. ["module load cmake"]
    ) -> int:
        """Spawn, stream stdout+stderr line by line, return exit code."""

class ComputeTarget(ABC):
    """Combined handle. Implementations pair an Executor and a Transport."""

    kind: str                         # "local" | "ssh" | "ssh+slurm" | ...
    cache_dir: PurePosixPath          # remote analogue of ATHENAK_CACHE_DIR

    transport: Transport
    executor: Executor

    @abstractmethod
    def close(self) -> None: ...
```

`RemoteEntry` is a small dataclass `(name, size, is_dir, mtime)` — enough to replace `Path.glob` in `services/outputs.list_outputs`.

## 4. Implementations

### 4.1 `LocalCompute` (zero behavioural change)

Wraps `subprocess.Popen` and `pathlib`. Exists so services don't fork on compute kind — there's a single code path.

### 4.2 `SshCompute` (new)

- **Library:** `paramiko` (`SSHClient` + `SFTPClient`). Reasons: pure Python, no native libssh2 build, well-known.
- **Authentication:** key-based only in v1. Key path is in the project config. Passphrase flow in §6.
- **Connection reuse:** one `SSHClient` per `(host, user, key_path)` cached in the process for the lifetime of the Celery worker. On `close()`, drop.
- **exec_streaming:** `client.exec_command(" && ".join(shell_prelude + [shlex.join(argv)]), get_pty=False)`. Read `stdout.readline()` in a loop; buffer stderr into the same stream (merge like the local path). Exit code via `stdout.channel.recv_exit_status()`.
- **Transport:** `client.open_sftp()` for file ops. `mkdir_p` walks components and tolerates EEXIST. `open_stream` chunks through SFTP for log replay.
- **Timeouts & keepalive:** `client.get_transport().set_keepalive(30)` so firewalls don't drop idle control channels during long builds.

### 4.3 `SshSlurmCompute` (future, same ABC)

Overrides only `Executor.run_streaming`:

1. Writes a job script into `cache_dir/jobs/<uuid>.sh` (the full `argv` body plus `shell_prelude`).
2. `sbatch --wait --output=<log>` (blocking) OR submit + poll; either works with the ABC.
3. Tails the Slurm `--output=` log file via SFTP in parallel, publishing each new line to the same `on_line` callback.
4. Returns the Slurm job's exit code.

No `services/builder.py` or `services/runner.py` changes required.

## 5. Project data model

Add two columns to `projects`:

```python
compute_kind: Mapped[str] = mapped_column(String(32), default="local", nullable=False)
compute_config: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
```

Shapes of `compute_config` (validated by a discriminated-union Pydantic model):

```jsonc
// local (default; no fields required)
{}

// ssh
{
  "host": "frontera.tacc.utexas.edu",
  "port": 22,
  "user": "dane",
  "key_path": "~/.ssh/id_ed25519_tacc",
  "remote_cache_dir": "/scratch/dane/athenak-frontend",
  "shell_prelude": [
    "module load cmake gcc/11 cuda/12",
    "export MY_THING=1"
  ]
}

// ssh+slurm
{
  ...ssh fields...,
  "scheduler": {
    "kind": "slurm",
    "partition": "gpu",
    "account": "AST20027",
    "time": "01:00:00",
    "gres": "gpu:1",
    "extra_sbatch_lines": ["--mail-type=END"]
  }
}
```

A lightweight Alembic migration (`0002_compute_target.py`) adds the columns with `server_default`s so existing rows fall back to `local`.

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

**Remote bootstrap:** because we can't ship `scripts/bootstrap_athenak.sh` to an unknown login node, the `SshCompute` implementation encapsulates this:

```python
def ensure_bootstrapped(self) -> None:
    if self.transport.exists(self.upstream_dir / ".git"): return
    self.executor.run_streaming(
        ["git", "clone", "--recurse-submodules", ATHENAK_GIT_URL, str(self.upstream_dir)],
        cwd=self.cache_dir,
        shell_prelude=self.config.shell_prelude,
    )
```

It's idempotent and safe to call at the start of every build.

## 8. Build flow over SSH (end-to-end)

1. Celery worker picks up `build_project(build_id)` (unchanged).
2. Task resolves `project.compute_kind` → instantiates `SshCompute(config)`.
3. `compute.ensure_bootstrapped()` clones AthenaK on the remote if needed.
4. **Upstream lock** is now a *remote* filelock: implemented as a `mkdir -p && flock` via a short shell helper we write to `cache_dir/.locks/upstream.lock`. Falls back to atomic `ln -s` for mountpoints that don't support `flock`.
5. Transport.upload_text stages `user_problem.cpp` into `upstream/athenak/src/pgen/`.
6. Executor runs `cmake -S ... -B ... -DPROBLEM=user_problem ...`, then `cmake --build ...`. `on_line` publishes each line to the same Redis channel as today.
7. Success → `binary_path` is the remote path `workspaces/<slug>/build/src/athena`.
8. `finally:` — unstage `user_problem.cpp`, release the remote lock. Same invariant as local.

## 9. Run flow over SSH

1. Celery task calls `compute = SshCompute(project.compute_config)`.
2. `Transport.upload_text(run_dir / "input.athinput", input_file.content)`.
3. `Executor.run_streaming([binary_path, "-i", "input.athinput"], cwd=run_dir, shell_prelude=...)`.
4. `Run.output_dir` is a *remote* path. That's fine — `GET /api/runs/:id/outputs` now iterates via `Transport.listdir`.

## 10. Output retrieval

The frontend contract is unchanged. On the backend:

- **`GET /api/runs/:id/outputs`** — `compute.transport.listdir(run.output_dir)` → filtered by known suffixes.
- **`GET /api/runs/:id/outputs/:name`** — stream via `Transport.open_stream`, response chunked. No full-file materialisation on the backend; we can serve multi-GB `.athdf` dumps.
- **`GET /api/runs/:id/outputs/:name/series`** — `.hst`/`.tab` are small (KB-MB); pull into memory via `Transport.read_text`, parse with the same `services/outputs` code, return JSON.
- **Optional caching** (later): a `?mirror=1` query that pulls the file to a local cache dir and subsequent requests serve from there. Not needed for v1.

## 11. Log streams over SSH

Two-place contract is preserved:

- **On-disk transcript:** the backend keeps writing to its *local* `workspaces/<slug>/logs/<...>.log`. Every line arriving via `Executor.run_streaming`'s `on_line` callback is appended.
- **Redis fan-out:** unchanged.
- The *remote* log written by athena itself (if any) is separate and not tailed — we rely on stdout streaming from paramiko. If a project uses `ssh+slurm` (detached batch), the executor tails the Slurm `--output=` log via periodic SFTP `stat` + `read` instead.

## 12. Connection pooling & concurrency

- A process-level `ComputeRegistry` maps `project_id → ComputeTarget`. Celery workers look up their per-project target once per task.
- `SshCompute` keeps a single `SSHClient` per `(host, user, key_path)`, regardless of project count. Multiple projects on the same cluster share the connection.
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

- **New project dialog:** a third field group — **Compute target** — with a radio (Local / SSH / SSH+Slurm). SSH reveals host/user/key-path/remote-cache-dir/shell-prelude fields. A **Probe** button POSTs `/api/compute/test` with the candidate config without saving anything.
- **Project header:** a small chip next to the slug — `local` or `ssh frontera.tacc` — so every tab is unambiguous.
- **Build panel:** existing cmake-flag checkboxes (MPI/CUDA/Debug) stay; the compute badge makes GPU builds feel less magical.
- **Outputs panel:** same file list and download links. For large files we link to `?mirror=1` so the user can pre-cache.
- **Compute settings page** (per project): edit key path / prelude, view last probe result.
- **Credentials banner:** if the SSH project needs a passphrase, a dismissible banner appears site-wide: "🔑 Unlock SSH key for project X" → inline form → calls `/unlock`.

## 15. Testing strategy

1. **Unit tests for Transport/Executor ABCs** via a fake in-memory implementation (`FakeCompute`). Services are tested against the fake — same contract, zero network.
2. **`SshCompute` integration tests** use [`mockssh`](https://pypi.org/project/mockssh/) (or a tiny `paramiko.Transport` test server fixture) running on localhost:2222. Exercises auth, command streaming, SFTP upload/download, bootstrap.
3. **Lock semantics:** the remote-lock helper has its own test using two concurrent `FakeCompute` clients sharing the same simulated filesystem.
4. **Failure-mode tests:** patch paramiko methods to raise (`AuthenticationException`, `EOFError`, `SSHException`) and assert each surfaces the user-visible mapping from §13.

## 16. Milestones

| # | Scope | Rough commits |
|---|---|---|
| J0 | Introduce `ComputeTarget` ABC + `LocalCompute`. Refactor `services/{builder,runner,outputs}` to take a compute arg. No behavioural change. | 1 |
| J1 | Add `compute_kind`/`compute_config` to `Project` + Alembic migration. API accepts them; UI still forces `local`. | 1 |
| J2 | `SshCompute` (paramiko) + `/api/compute/{id}/probe` + `/unlock` endpoints. Fake-SSH tests. | 1–2 |
| J3 | Remote bootstrap + remote upstream lock. Full build/run lifecycle over SSH passes end-to-end against a test VM. | 1 |
| J4 | UI: compute-target field group in New Project dialog + compute chip in project header + passphrase banner. | 1 |
| J5 | Output streaming via SFTP + optional `?mirror=1` local cache. | 1 |
| J6 | `SshSlurmCompute`: sbatch submission, `--output=` tailing. | 1 |

J0–J2 are the minimum to call it "plug-n-play". J3–J5 are what an actual HPC user needs day-to-day. J6 is the one that unlocks big-GPU runs.

## 17. Open questions (flag before J2 starts)

- **Windows clients?** paramiko works, but key-path expansion and permission checks differ. Out of scope for v1 — assume Linux/macOS host running the backend.
- **X11 / TTY needs?** None for batch-style runs. Revisit if AthenaK adds an interactive debugger.
- **Multi-hop SSH / bastions?** Defer; add `ProxyCommand`/`proxy_jump` to `compute_config` when a user asks.
- **Rate-limiting on a shared SSHClient?** Currently one build at a time per project due to the upstream lock; cross-project concurrency inherits paramiko's thread-safety, which is per-channel. We'll add a small semaphore around `exec_command` if we see corruption in practice.
- **Kerberos/GSSAPI auth?** Paramiko supports it. Deferred behind an `auth_method` field in `compute_config` when there's a user who needs it.

## 18. Reference

- Compute ABC: `backend/app/services/compute/base.py` (new).
- Local impl: `backend/app/services/compute/local.py` (refactored from today's builder/runner internals).
- SSH impl: `backend/app/services/compute/ssh.py` (new, J2).
- Slurm impl: `backend/app/services/compute/ssh_slurm.py` (new, J6).
- Registry / factory: `backend/app/services/compute/__init__.py` (`get_compute(project)`).
- Tests: `backend/tests/test_compute_*.py` (mirrors the module split).

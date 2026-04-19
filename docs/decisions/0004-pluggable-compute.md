# ADR 0004 — Per-project pluggable compute (Transport × Scheduler)

**Status:** Accepted. Design in `docs/HPC-SSH.md`. Implementation tracked as J-milestones.

## Context

MVP assumed `subprocess.Popen` on the backend host. That breaks on clusters where real work happens over SSH, on compute nodes reached via a batch scheduler (Slurm / PBS / LSF), or where modules must be loaded before `cmake` is on `$PATH`.

## Decision

- **Transport** and **Scheduler** are orthogonal.
  - `Transport` owns how bytes + commands reach a host: `LocalTransport` (`subprocess`) or `SshTransport` (paramiko).
  - `Scheduler` optionally wraps a direct exec in a batch job: `NoScheduler` (default, pass-through) or `SlurmScheduler` (sbatch).
- A project carries a single `compute_config` JSON blob with nested `transport` + `scheduler` + `scheduler_scope: ["run"]` (default).
- Services call `compute.exec_for(phase, argv, …)`; the target dispatches to `transport.run_direct` or `scheduler.submit(transport, …)` based on whether `phase` is in `scheduler_scope`.

## Consequences

- Adding PBS/LSF/SGE = one new `Scheduler` subclass, zero service changes.
- `local + slurm` (workstation with `slurmd`) falls out for free.
- The UI picker has two independent field groups; the Scheduler group is collapsed by default so Slurm is never forced on a user.
- The "sacred upstream invariant" (user_problem.cpp staged transiently) applies identically to remote mode — builder.py takes the same filelock, just over SFTP.

## Alternatives considered

- **Single `compute_kind` enum** (`local | ssh | ssh+slurm`). Forces a new string for every combination and hid SSH-without-Slurm as a first-class config. Superseded before implementation; design captured in `docs/HPC-SSH.md`.
- **Backend per compute kind (fork the service).** Duplicates services/builder and services/runner. Rejected — every bug would need two fixes.

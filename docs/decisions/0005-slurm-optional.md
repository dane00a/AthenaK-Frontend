# ADR 0005 — Slurm is an orthogonal, optional Scheduler

**Status:** Accepted. Implementation planned as J6.

## Context

"HPC" isn't synonymous with "Slurm". Many users SSH into a login or interactive node and run commands directly; forcing a batch submission on every build adds queue latency to the edit-compile loop without benefit.

## Decision

- `Scheduler.kind` defaults to `"none"` — `NoScheduler` is a one-line pass-through to `transport.run_direct`.
- Opting into `"slurm"` requires two explicit fields (`scheduler.kind = "slurm"` plus at least `partition`). The UI picker for the Scheduler group is collapsed by default.
- `scheduler_scope` defaults to `["run"]`. Builds stay direct on the login node; only simulations go through the queue. A user who wants builds in Slurm too must flip the checkbox.
- Removing Slurm support from a deployment means not registering `SlurmScheduler` in the factory and rejecting `scheduler.kind == "slurm"` at validation. Transport code is untouched.

## Consequences

- The roadmap (`docs/HPC-SSH.md §16`) places J6 (SlurmScheduler) *after* J3 (SSH-without-Slurm shippable). SSH users don't wait on Slurm, and the Slurm adapter isn't on the critical path.
- Services never branch on "is this Slurm?" — they call `compute.exec_for(phase, argv, …)` and the target picks.
- Test strategy: a `FakeTransport` records commands; `SlurmScheduler` is exercised without a real cluster (`sbatch --test-only` covers the probe path).

## Alternatives considered

- **Slurm required for any SSH backend.** Rejected — see Context.
- **Per-launch scheduler choice.** Deferred; the current schema supports it as a later addition (`scheduler_scope` override field on `POST /builds` / `POST /runs`) without a schema migration.

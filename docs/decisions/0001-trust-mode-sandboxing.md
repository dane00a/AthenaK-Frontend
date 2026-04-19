# ADR 0001 — Trust-mode local sandboxing

**Status:** Accepted.

## Context

Users author C++ problem generators in the browser and submit them for compilation. That's arbitrary native code running on the backend host. A defensive posture would run every build + run in a disposable Docker container or a `bubblewrap` jail.

## Decision

Trust the caller. No per-build sandboxing. The UI and backend run on the same host; we assume a single trusted user on a personal workstation, HPC login node, or researcher's laptop.

## Consequences

- Fewer moving parts: no container runtime requirement, no image maintenance, no cross-container volume semantics.
- The optional auth flag (ADR 0006) becomes the only gate against a remote attacker.
- If we ever expose this as SaaS, every build-path assumption has to change — revisit this ADR before doing so.

## Alternatives considered

- **Docker-per-build.** Clean isolation but adds a hard dep on Docker, doubles build latency for small changes, and complicates GPU/MPI passthrough on HPC.
- **bubblewrap / firejail.** Lighter than Docker but the policy surface for a full C++ compile (network for `git`, `/usr` read, tmp write…) is painful to maintain.

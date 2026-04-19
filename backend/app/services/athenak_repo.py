"""Manage the shared upstream AthenaK clone.

The upstream tree is read-mostly. The only mutation is transient: a single
`user_problem.cpp` is placed into ``src/pgen/`` by :mod:`app.services.builder`
for the duration of a build, then removed. See CLAUDE.md §4.
"""

from __future__ import annotations

import subprocess
from pathlib import Path

from filelock import FileLock

from ..config import settings

PGEN_STAGED_NAME = "user_problem.cpp"


def _lock_path() -> Path:
    return settings.athenak_cache_dir.expanduser() / "upstream.lock"


def upstream_lock() -> FileLock:
    """A process-wide lock for mutations against the upstream clone."""
    _lock_path().parent.mkdir(parents=True, exist_ok=True)
    return FileLock(str(_lock_path()))


def pgen_dir() -> Path:
    return settings.upstream_dir / "src" / "pgen"


def staged_pgen_path() -> Path:
    return pgen_dir() / PGEN_STAGED_NAME


def is_cloned() -> bool:
    return (settings.upstream_dir / ".git").is_dir()


def ensure_cloned(ref: str | None = None) -> Path:
    """Clone or fast-forward the upstream clone. Returns its path.

    For first-time setup we delegate to ``scripts/bootstrap_athenak.sh`` so
    CLI and API paths stay in sync; this wrapper just checks the state.
    """
    target = settings.upstream_dir
    if not is_cloned():
        raise RuntimeError(
            f"AthenaK not cloned at {target}. Run ./scripts/bootstrap_athenak.sh first."
        )
    if ref:
        subprocess.run(
            ["git", "-C", str(target), "fetch", "--recurse-submodules", "origin"],
            check=True,
        )
        subprocess.run(["git", "-C", str(target), "checkout", ref], check=True)
        subprocess.run(
            ["git", "-C", str(target), "submodule", "update", "--init", "--recursive"],
            check=True,
        )
    return target


def reset_pgen() -> None:
    """Remove any stale ``user_problem.cpp`` staged in ``src/pgen/``.

    Call on worker startup; guards against a previous crashed build leaving
    state behind.
    """
    staged = staged_pgen_path()
    if staged.exists():
        staged.unlink()

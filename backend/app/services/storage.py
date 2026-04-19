"""Filesystem helpers for storage accounting + run purging.

Walks the workspace on demand — no caching in v1, since these are
admin-ish endpoints not hit on every page load.
"""
from __future__ import annotations

import shutil
from dataclasses import dataclass
from pathlib import Path

from . import workspace


def _dir_size(path: Path) -> int:
    total = 0
    if not path.exists():
        return 0
    for p in path.rglob("*"):
        if p.is_file():
            try:
                total += p.stat().st_size
            except OSError:
                continue
    return total


@dataclass
class RunUsage:
    run_id: int
    bytes: int


@dataclass
class StorageReport:
    total_bytes: int
    build_bytes: int
    logs_bytes: int
    run_bytes: list[RunUsage]


def report(slug: str) -> StorageReport:
    root = workspace.project_dir(slug)
    if not root.exists():
        return StorageReport(total_bytes=0, build_bytes=0, logs_bytes=0, run_bytes=[])

    build_bytes = _dir_size(workspace.build_dir(slug))
    logs_bytes = _dir_size(workspace.logs_dir(slug))
    run_bytes: list[RunUsage] = []
    runs_root = workspace.runs_dir(slug)
    if runs_root.exists():
        for entry in sorted(runs_root.iterdir(), key=lambda p: p.name):
            if not entry.is_dir():
                continue
            try:
                run_id = int(entry.name)
            except ValueError:
                continue
            run_bytes.append(RunUsage(run_id=run_id, bytes=_dir_size(entry)))
    total = build_bytes + logs_bytes + sum(r.bytes for r in run_bytes)
    return StorageReport(
        total_bytes=total,
        build_bytes=build_bytes,
        logs_bytes=logs_bytes,
        run_bytes=run_bytes,
    )


def purge_run(slug: str, run_id: int) -> bool:
    target = workspace.runs_dir(slug) / str(run_id)
    if not target.exists():
        return False
    shutil.rmtree(target, ignore_errors=True)
    return True


def apply_retention(slug: str, policy: dict, protect_run_id: int | None = None) -> list[int]:
    """Return the list of run_ids whose directories were purged."""
    if policy.get("kind") != "keep_last_n":
        return []
    n = int(policy.get("n", 10))
    if n < 1:
        return []
    runs_root = workspace.runs_dir(slug)
    if not runs_root.exists():
        return []
    ids: list[int] = []
    for entry in runs_root.iterdir():
        if not entry.is_dir():
            continue
        try:
            ids.append(int(entry.name))
        except ValueError:
            continue
    # Newest run_ids win; purge everything older except the current one.
    ids.sort()
    to_keep = set(ids[-n:])
    if protect_run_id is not None:
        to_keep.add(protect_run_id)
    purged: list[int] = []
    for rid in ids:
        if rid in to_keep:
            continue
        if purge_run(slug, rid):
            purged.append(rid)
    return purged

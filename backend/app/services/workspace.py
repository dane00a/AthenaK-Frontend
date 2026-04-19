"""Per-project filesystem layout under ``$ATHENAK_CACHE_DIR/workspaces/``."""

from __future__ import annotations

from pathlib import Path

from ..config import settings


def project_dir(slug: str) -> Path:
    return settings.workspaces_dir / slug


def build_dir(slug: str) -> Path:
    return project_dir(slug) / "build"


def inputs_dir(slug: str) -> Path:
    return project_dir(slug) / "inputs"


def runs_dir(slug: str) -> Path:
    return project_dir(slug) / "runs"


def logs_dir(slug: str) -> Path:
    return project_dir(slug) / "logs"


def ensure_layout(slug: str) -> None:
    for d in (project_dir(slug), build_dir(slug), inputs_dir(slug), runs_dir(slug), logs_dir(slug)):
        d.mkdir(parents=True, exist_ok=True)

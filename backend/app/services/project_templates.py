"""Loader for the static project-template catalog under backend/templates/projects/."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import yaml

TEMPLATES_DIR = Path(__file__).resolve().parents[2] / "templates" / "projects"


@lru_cache(maxsize=1)
def list_templates() -> list[dict]:
    """All templates sorted by id."""
    out: list[dict] = []
    if not TEMPLATES_DIR.exists():
        return out
    for path in sorted(TEMPLATES_DIR.glob("*.yaml")):
        out.append(yaml.safe_load(path.read_text(encoding="utf-8")))
    return out


def get_template(template_id: str) -> dict | None:
    return next((t for t in list_templates() if t.get("id") == template_id), None)

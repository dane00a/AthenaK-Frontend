from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from ..models.build import BuildStatus


class BuildCreate(BaseModel):
    cmake_flags: dict[str, Any] = {}


class BuildOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    status: BuildStatus
    cmake_flags: dict[str, Any]
    log_path: str | None
    binary_path: str | None
    error: str | None
    diagnostics: list[dict[str, Any]] = []
    source_hash: str | None = None
    reused_from: int | None = None
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime

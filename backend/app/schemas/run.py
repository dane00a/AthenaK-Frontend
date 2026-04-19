from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from ..models.run import RunStatus


class RunCreate(BaseModel):
    input_file_id: int


class RunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    build_id: int
    input_file_id: int
    status: RunStatus
    pid: int | None
    log_path: str | None
    output_dir: str | None
    exit_code: int | None
    error: str | None
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime

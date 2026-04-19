from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class InputFileCreate(BaseModel):
    filename: str = Field(min_length=1, max_length=200)
    content: str = ""


class InputFileUpdate(BaseModel):
    filename: str | None = None
    content: str | None = None


class InputFileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    filename: str
    content: str
    updated_at: datetime

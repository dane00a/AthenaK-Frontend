from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    physics_module: str = "hydro"
    athenak_ref: str = "main"


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    physics_module: str | None = None
    athenak_ref: str | None = None


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    physics_module: str
    athenak_ref: str
    created_at: datetime
    updated_at: datetime

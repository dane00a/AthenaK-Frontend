from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class ProblemFileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    content: str
    updated_at: datetime


class ProblemFileUpdate(BaseModel):
    content: str
    filename: str | None = None


class WizardParamsIn(BaseModel):
    physics_module: str = "hydro"
    initial_condition: str = "uniform"
    emit_par_for_loop: bool = True
    call_prim_to_cons: bool = True
    register_user_bcs: bool = False
    register_user_srcs: bool = False
    register_user_refinement: bool = False
    register_user_history: bool = False
    parameters: dict[str, Any] = {}

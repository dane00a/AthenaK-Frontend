from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import ProblemFile, Project
from ..schemas import ProblemFileOut, ProblemFileUpdate, WizardParamsIn
from ..services.templates import WizardParams, render_problem_cpp

router = APIRouter(tags=["problems"])


class WizardPreview(BaseModel):
    content: str
    base_content: str


def _require_problem(project_id: int, db: Session) -> ProblemFile:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "project not found")
    if project.problem_file is None:
        project.problem_file = ProblemFile(filename="user_problem.cpp", content="")
        db.commit()
        db.refresh(project)
    return project.problem_file


@router.get("/projects/{project_id}/problem", response_model=ProblemFileOut)
def get_problem(project_id: int, db: Session = Depends(get_db)) -> ProblemFile:
    return _require_problem(project_id, db)


@router.put("/projects/{project_id}/problem", response_model=ProblemFileOut)
def put_problem(
    project_id: int, body: ProblemFileUpdate, db: Session = Depends(get_db)
) -> ProblemFile:
    problem = _require_problem(project_id, db)
    problem.content = body.content
    if body.filename:
        problem.filename = body.filename
    db.commit()
    db.refresh(problem)
    return problem


@router.post("/projects/{project_id}/problem/from-wizard", response_model=ProblemFileOut)
def generate_from_wizard(
    project_id: int, body: WizardParamsIn, db: Session = Depends(get_db)
) -> ProblemFile:
    problem = _require_problem(project_id, db)
    params = WizardParams(**body.model_dump(exclude={"parameters"}), parameters=body.parameters)
    problem.content = render_problem_cpp(params, prior_source=problem.content or None)
    db.commit()
    db.refresh(problem)
    return problem


@router.post(
    "/projects/{project_id}/problem/from-wizard/preview",
    response_model=WizardPreview,
)
def preview_from_wizard(
    project_id: int, body: WizardParamsIn, db: Session = Depends(get_db)
) -> WizardPreview:
    """Return what Generate would produce without saving. Pairs with a Monaco
    DiffEditor so the user sees which non-user-region lines would be replaced."""
    problem = _require_problem(project_id, db)
    base = problem.content or ""
    params = WizardParams(**body.model_dump(exclude={"parameters"}), parameters=body.parameters)
    rendered = render_problem_cpp(params, prior_source=base or None)
    return WizardPreview(content=rendered, base_content=base)

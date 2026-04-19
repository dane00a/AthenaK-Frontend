from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import InputFile, ProblemFile, Project
from ..schemas import ProjectOut
from ..services.project_templates import get_template, list_templates
from ..services.slug import unique_slug
from ..services.templates import WizardParams, render_problem_cpp

router = APIRouter(prefix="/templates", tags=["templates"])


class TemplateSummary(BaseModel):
    id: str
    name: str
    description: str
    physics_module: str


class CreateFromTemplate(BaseModel):
    template_id: str
    name: str | None = None  # defaults to the template's display name


@router.get("", response_model=list[TemplateSummary])
def list_project_templates() -> list[TemplateSummary]:
    return [
        TemplateSummary(
            id=t["id"],
            name=t["name"],
            description=t["description"],
            physics_module=t["physics_module"],
        )
        for t in list_templates()
    ]


@router.post(
    "/{template_id}/projects",
    response_model=ProjectOut,
    status_code=status.HTTP_201_CREATED,
)
def create_project_from_template(
    template_id: str,
    body: CreateFromTemplate,
    db: Session = Depends(get_db),
) -> Project:
    tpl = get_template(template_id)
    if tpl is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"template {template_id!r} not found")

    name = body.name or tpl["name"]
    existing = {s for (s,) in db.execute(__import__("sqlalchemy").select(Project.slug))}
    slug = unique_slug(name, existing)

    project = Project(name=name, slug=slug, physics_module=tpl["physics_module"])

    wizard = WizardParams(**tpl.get("wizard_state", {}))
    project.problem_file = ProblemFile(
        filename="user_problem.cpp",
        content=render_problem_cpp(wizard),
    )
    for inp in tpl.get("inputs", []):
        project.input_files.append(
            InputFile(filename=inp["filename"], content=inp["content"])
        )

    db.add(project)
    db.commit()
    db.refresh(project)
    return project

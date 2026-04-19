from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Build, BuildStatus, Project
from ..schemas import BuildCreate, BuildOut
from ..services import process_registry
from ..workers import tasks

router = APIRouter(tags=["builds"])


@router.get("/projects/{project_id}/builds", response_model=list[BuildOut])
def list_builds(project_id: int, db: Session = Depends(get_db)) -> list[Build]:
    if db.get(Project, project_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "project not found")
    return list(
        db.scalars(
            select(Build)
            .where(Build.project_id == project_id)
            .order_by(Build.created_at.desc())
        )
    )


@router.post(
    "/projects/{project_id}/builds",
    response_model=BuildOut,
    status_code=status.HTTP_201_CREATED,
)
def create_build(
    project_id: int, body: BuildCreate, db: Session = Depends(get_db)
) -> Build:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "project not found")
    build = Build(project_id=project_id, cmake_flags=body.cmake_flags)
    db.add(build)
    db.commit()
    db.refresh(build)
    # Fire-and-forget enqueue. In unit tests Celery runs in eager/None mode,
    # so this call is a no-op unless a broker is configured.
    tasks.build_project.delay(build.id)
    return build


@router.get("/builds/{build_id}", response_model=BuildOut)
def get_build(build_id: int, db: Session = Depends(get_db)) -> Build:
    build = db.get(Build, build_id)
    if build is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "build not found")
    return build


@router.post("/builds/{build_id}/cancel", response_model=BuildOut)
def cancel_build(build_id: int, db: Session = Depends(get_db)) -> Build:
    build = db.get(Build, build_id)
    if build is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "build not found")
    if build.status not in (BuildStatus.queued, BuildStatus.running):
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"cannot cancel a build in state {build.status.value}"
        )
    terminated = process_registry.cancel_build(build_id)
    if not terminated and build.status == BuildStatus.queued:
        # Task hadn't started yet; mark cancelled directly so it never runs.
        build.status = BuildStatus.cancelled
        build.error = "cancelled before start"
        db.commit()
    db.refresh(build)
    return build

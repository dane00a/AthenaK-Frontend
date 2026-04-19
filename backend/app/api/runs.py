from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Build, InputFile, Run
from ..schemas import RunCreate, RunOut
from ..workers import tasks

router = APIRouter(tags=["runs"])


@router.post(
    "/builds/{build_id}/runs",
    response_model=RunOut,
    status_code=status.HTTP_201_CREATED,
)
def create_run(build_id: int, body: RunCreate, db: Session = Depends(get_db)) -> Run:
    build = db.get(Build, build_id)
    if build is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "build not found")
    inp = db.get(InputFile, body.input_file_id)
    if inp is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "input file not found")
    run = Run(build_id=build_id, input_file_id=body.input_file_id)
    db.add(run)
    db.commit()
    db.refresh(run)
    tasks.run_simulation.delay(run.id)
    return run


@router.get("/builds/{build_id}/runs", response_model=list[RunOut])
def list_runs(build_id: int, db: Session = Depends(get_db)) -> list[Run]:
    if db.get(Build, build_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "build not found")
    return list(
        db.scalars(
            select(Run).where(Run.build_id == build_id).order_by(Run.created_at.desc())
        )
    )


@router.get("/runs/{run_id}", response_model=RunOut)
def get_run(run_id: int, db: Session = Depends(get_db)) -> Run:
    run = db.get(Run, run_id)
    if run is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "run not found")
    return run

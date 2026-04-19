from __future__ import annotations

import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Build, InputFile, Run, RunStatus
from ..schemas import RunCreate, RunOut
from ..services import process_registry
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


@router.post("/runs/{run_id}/cancel", response_model=RunOut)
def cancel_run(run_id: int, db: Session = Depends(get_db)) -> Run:
    run = db.get(Run, run_id)
    if run is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "run not found")
    if run.status not in (RunStatus.queued, RunStatus.running):
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"cannot cancel a run in state {run.status.value}"
        )
    terminated = process_registry.cancel_run(run_id)
    if not terminated and run.status == RunStatus.queued:
        run.status = RunStatus.cancelled
        run.error = "cancelled before start"
        db.commit()
    db.refresh(run)
    return run


@router.delete("/runs/{run_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_run(run_id: int, db: Session = Depends(get_db)) -> None:
    """Remove the run DB row, its output directory, and its log file.

    Fails with 409 if the run is still in flight — cancel first.
    """
    run = db.get(Run, run_id)
    if run is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "run not found")
    if run.status in (RunStatus.queued, RunStatus.running):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"cannot delete a run in state {run.status.value}; cancel first",
        )
    # Drop on-disk artifacts.
    if run.output_dir:
        out_dir = Path(run.output_dir)
        if out_dir.exists():
            shutil.rmtree(out_dir, ignore_errors=True)
    if run.log_path:
        log_path = Path(run.log_path)
        if log_path.exists():
            log_path.unlink(missing_ok=True)

    db.delete(run)
    db.commit()

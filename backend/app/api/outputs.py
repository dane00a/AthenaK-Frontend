from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Run
from ..services import outputs, outputs_athdf, runner

router = APIRouter(tags=["outputs"])


class OutputFileOut(BaseModel):
    name: str
    size: int
    kind: str


class SeriesOut(BaseModel):
    columns: list[str]
    rows: list[list[float]]


def _run_output_dir(run: Run) -> Path:
    if run.output_dir is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "run has no output directory yet")
    return Path(run.output_dir)


def _classify(path: Path) -> str:
    return path.suffix.lstrip(".") or "bin"


def _resolve(run: Run, name: str) -> Path:
    """Resolve ``name`` against the run's output directory with path traversal guard."""
    base = _run_output_dir(run).resolve()
    candidate = (base / name).resolve()
    if base not in candidate.parents and candidate != base:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "invalid path")
    if not candidate.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "output not found")
    return candidate


@router.get("/runs/{run_id}/outputs", response_model=list[OutputFileOut])
def list_run_outputs(run_id: int, db: Session = Depends(get_db)) -> list[OutputFileOut]:
    run = db.get(Run, run_id)
    if run is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "run not found")
    out_dir = _run_output_dir(run)
    if not out_dir.exists():
        return []
    return [
        OutputFileOut(name=p.name, size=p.stat().st_size, kind=_classify(p))
        for p in runner.list_outputs(out_dir)
    ]


@router.get("/runs/{run_id}/outputs/{name}")
def download_run_output(run_id: int, name: str, db: Session = Depends(get_db)) -> FileResponse:
    run = db.get(Run, run_id)
    if run is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "run not found")
    path = _resolve(run, name)
    return FileResponse(path, filename=path.name)


@router.get("/runs/{run_id}/outputs/{name}/series", response_model=SeriesOut)
def read_run_series(run_id: int, name: str, db: Session = Depends(get_db)) -> SeriesOut:
    run = db.get(Run, run_id)
    if run is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "run not found")
    path = _resolve(run, name)
    kind = _classify(path)
    if kind == "hst":
        series = outputs.parse_hst(path)
    elif kind == "tab":
        series = outputs.parse_tab(path)
    else:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, f"cannot parse .{kind} as series"
        )
    return SeriesOut(columns=series.columns, rows=series.rows)


class FieldOut(BaseModel):
    variable: str
    axis: str
    index: int
    shape: tuple[int, int]
    x: list[float]
    y: list[float]
    z: list[list[float]]
    vmin: float
    vmax: float


class FieldVarsOut(BaseModel):
    variables: list[str]


@router.get("/runs/{run_id}/outputs/{name}/variables", response_model=FieldVarsOut)
def list_field_variables(
    run_id: int, name: str, db: Session = Depends(get_db)
) -> FieldVarsOut:
    run = db.get(Run, run_id)
    if run is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "run not found")
    path = _resolve(run, name)
    kind = _classify(path)
    if kind not in {"athdf", "hdf5", "h5"}:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            f"variables only available for HDF5 files, got .{kind}",
        )
    try:
        return FieldVarsOut(variables=outputs_athdf.list_variables(path))
    except OSError as e:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"failed to read: {e}") from e


@router.get("/runs/{run_id}/outputs/{name}/field", response_model=FieldOut)
def read_field(
    run_id: int,
    name: str,
    var: str,
    axis: str = "z",
    index: int = 0,
    db: Session = Depends(get_db),
) -> FieldOut:
    run = db.get(Run, run_id)
    if run is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "run not found")
    path = _resolve(run, name)
    kind = _classify(path)
    if kind not in {"athdf", "hdf5", "h5"}:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            f"field slices only available for HDF5 files, got .{kind}",
        )
    try:
        field = outputs_athdf.read_field(path, variable=var, axis=axis, index=index)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e)) from e
    except OSError as e:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"failed to read: {e}") from e
    return FieldOut(
        variable=field.variable,
        axis=field.axis,
        index=field.index,
        shape=field.shape,
        x=field.x,
        y=field.y,
        z=field.z,
        vmin=field.vmin,
        vmax=field.vmax,
    )

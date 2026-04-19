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


class ProfileOut(BaseModel):
    variable: str
    s: list[float]
    values: list[float]
    x: list[float]
    y: list[float]


@router.get("/runs/{run_id}/outputs/{name}/profile", response_model=ProfileOut)
def read_line_profile(
    run_id: int,
    name: str,
    var: str,
    x0: float,
    y0: float,
    x1: float,
    y1: float,
    axis: str = "z",
    index: int = 0,
    samples: int = 256,
    db: Session = Depends(get_db),
) -> ProfileOut:
    """Sample ``var`` along a line on the heatmap slab. Pixel coordinates
    live in the same space as :meth:`GET /field` returns (downsampled to
    max_dim per axis), so the caller can click the rendered Plotly trace
    and pass those coordinates directly."""
    run = db.get(Run, run_id)
    if run is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "run not found")
    path = _resolve(run, name)
    kind = _classify(path)
    if kind not in {"athdf", "hdf5", "h5"}:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            f"profiles only available for HDF5 files, got .{kind}",
        )
    try:
        prof = outputs_athdf.read_profile(
            path, variable=var, axis=axis, index=index,
            x0=x0, y0=y0, x1=x1, y1=y1, samples=samples,
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e)) from e
    except OSError as e:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"failed to read: {e}") from e
    return ProfileOut(
        variable=prof.variable, s=prof.s, values=prof.values, x=prof.x, y=prof.y
    )


class TimeseriesOut(BaseModel):
    variable: str
    t: list[float]
    values: list[float]
    files: list[str]


@router.get("/runs/{run_id}/timeseries", response_model=TimeseriesOut)
def read_point_timeseries(
    run_id: int,
    var: str,
    x: int,
    y: int,
    z: int = 0,
    pattern: str = "*.athdf",
    db: Session = Depends(get_db),
) -> TimeseriesOut:
    """Read a single cell of ``var`` across every HDF5 dump matching
    ``pattern`` in the run's output directory. One sample per file; ``t``
    is the file's Time attr when present, else the dump index."""
    run = db.get(Run, run_id)
    if run is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "run not found")
    out_dir = _run_output_dir(run)
    files = sorted(out_dir.glob(pattern))
    if not files:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, f"no files match {pattern!r} in {out_dir}"
        )
    # Guard against escape via pattern like '../foo'.
    base = out_dir.resolve()
    for f in files:
        if base not in f.resolve().parents:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "invalid pattern")
    try:
        ts = outputs_athdf.read_point_timeseries(files, variable=var, x=x, y=y, z=z)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e)) from e
    except OSError as e:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"failed to read: {e}") from e
    return TimeseriesOut(
        variable=ts.variable, t=ts.t, values=ts.values, files=ts.files
    )

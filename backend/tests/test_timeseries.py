"""Unit + REST coverage of the point time-series endpoint."""

from __future__ import annotations

from pathlib import Path

import h5py
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.services import outputs_athdf


def _make_dump(path: Path, value: float, time_attr: float | None = None) -> None:
    with h5py.File(path, "w") as f:
        f.create_dataset("rho", data=np.full((2, 4, 4), value, dtype="float32"))
        if time_attr is not None:
            f.attrs["Time"] = time_attr


def test_read_point_timeseries_uses_time_attr(tmp_path: Path) -> None:
    a = tmp_path / "a.athdf"
    b = tmp_path / "b.athdf"
    _make_dump(a, value=1.0, time_attr=0.0)
    _make_dump(b, value=5.0, time_attr=0.5)
    ts = outputs_athdf.read_point_timeseries([a, b], variable="rho", x=0, y=0, z=0)
    assert ts.t == [0.0, 0.5]
    assert ts.values == [1.0, 5.0]
    assert ts.files == ["a.athdf", "b.athdf"]


def test_read_point_timeseries_falls_back_to_index(tmp_path: Path) -> None:
    a = tmp_path / "a.athdf"
    b = tmp_path / "b.athdf"
    _make_dump(a, value=2.0)
    _make_dump(b, value=3.0)
    ts = outputs_athdf.read_point_timeseries([a, b], variable="rho", x=0, y=0, z=0)
    assert ts.t == [0.0, 1.0]
    assert ts.values == [2.0, 3.0]


def test_read_point_timeseries_empty_raises() -> None:
    with pytest.raises(ValueError):
        outputs_athdf.read_point_timeseries([], variable="rho", x=0, y=0)


def _seed_run(client: TestClient, body_a: bytes, body_b: bytes) -> int:
    from app import db as _db  # noqa: PLC0415
    from app.models import Build, BuildStatus, InputFile, Project, Run, RunStatus  # noqa: PLC0415
    from app.services import workspace  # noqa: PLC0415

    with _db.SessionLocal() as db:
        project = Project(name="ts", slug="ts")
        db.add(project)
        db.commit()
        db.refresh(project)
        workspace.ensure_layout(project.slug)
        build = Build(project_id=project.id, cmake_flags={}, status=BuildStatus.success)
        db.add(build)
        db.commit()
        db.refresh(build)
        inp = InputFile(project_id=project.id, filename="x", content="")
        db.add(inp)
        db.commit()
        db.refresh(inp)
        run_dir = workspace.runs_dir(project.slug) / "1"
        run_dir.mkdir(parents=True, exist_ok=True)
        (run_dir / "a.athdf").write_bytes(body_a)
        (run_dir / "b.athdf").write_bytes(body_b)
        run = Run(
            build_id=build.id,
            input_file_id=inp.id,
            status=RunStatus.success,
            output_dir=str(run_dir),
        )
        db.add(run)
        db.commit()
        db.refresh(run)
        return run.id


def test_timeseries_endpoint_200(client: TestClient, tmp_path: Path) -> None:
    a = tmp_path / "a.athdf"
    b = tmp_path / "b.athdf"
    _make_dump(a, value=1.0, time_attr=0.0)
    _make_dump(b, value=5.0, time_attr=0.5)
    rid = _seed_run(client, a.read_bytes(), b.read_bytes())
    r = client.get(
        f"/api/runs/{rid}/timeseries",
        params={"var": "rho", "x": 0, "y": 0, "z": 0},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["variable"] == "rho"
    assert body["t"] == [0.0, 0.5]
    assert body["values"] == [1.0, 5.0]
    assert body["files"] == ["a.athdf", "b.athdf"]


def test_timeseries_endpoint_no_match_404(client: TestClient, tmp_path: Path) -> None:
    a = tmp_path / "a.athdf"
    _make_dump(a, value=1.0)
    rid = _seed_run(client, a.read_bytes(), a.read_bytes())
    r = client.get(
        f"/api/runs/{rid}/timeseries",
        params={"var": "rho", "x": 0, "y": 0, "pattern": "*.nothing"},
    )
    assert r.status_code == 404

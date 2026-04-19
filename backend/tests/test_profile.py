"""Unit + REST coverage of the heatmap line-profile endpoint."""

from __future__ import annotations

from pathlib import Path

import h5py
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.services import outputs_athdf


def _make_file(path: Path, shape: tuple[int, int, int] = (2, 8, 16)) -> None:
    with h5py.File(path, "w") as f:
        # nz, ny, nx with a constant x-gradient in the z=0 slice so we can
        # reason about sampled values.
        data = np.zeros(shape, dtype="float32")
        for i in range(shape[2]):
            data[:, :, i] = float(i)
        f.create_dataset("rho", data=data)


def test_read_profile_horizontal_is_x_gradient(tmp_path: Path) -> None:
    p = tmp_path / "demo.athdf"
    _make_file(p)
    prof = outputs_athdf.read_profile(
        p, variable="rho", axis="z", index=0, x0=0, y0=0, x1=15, y1=0, samples=16
    )
    # First sample ~ 0, last sample ~ 15, monotonically increasing.
    assert abs(prof.values[0] - 0.0) < 1e-6
    assert abs(prof.values[-1] - 15.0) < 1e-6
    # strict=False: .values[1:] is intentionally one shorter than .values.
    assert all(b >= a for a, b in zip(prof.values, prof.values[1:], strict=False))


def test_read_profile_length_matches_samples(tmp_path: Path) -> None:
    p = tmp_path / "demo.athdf"
    _make_file(p)
    prof = outputs_athdf.read_profile(
        p, variable="rho", axis="z", index=0, x0=0, y0=0, x1=15, y1=7, samples=64
    )
    assert len(prof.s) == 64
    assert len(prof.values) == 64
    assert prof.s[0] == 0.0 and prof.s[-1] == 1.0


def _seed_run_with_athdf(client: TestClient, body: bytes) -> int:
    from app import db as _db  # noqa: PLC0415
    from app.models import Build, BuildStatus, InputFile, Project, Run, RunStatus  # noqa: PLC0415
    from app.services import workspace  # noqa: PLC0415

    with _db.SessionLocal() as db:
        project = Project(name="prof", slug="prof")
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
        (run_dir / "demo.athdf").write_bytes(body)
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


@pytest.fixture
def run_with_h5(tmp_path: Path, client: TestClient) -> int:
    p = tmp_path / "demo.athdf"
    _make_file(p)
    return _seed_run_with_athdf(client, p.read_bytes())


def test_profile_endpoint_200(client: TestClient, run_with_h5: int) -> None:
    r = client.get(
        f"/api/runs/{run_with_h5}/outputs/demo.athdf/profile",
        params={"var": "rho", "x0": 0, "y0": 0, "x1": 15, "y1": 0, "samples": 8},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["variable"] == "rho"
    assert len(body["values"]) == 8
    assert abs(body["values"][0] - 0.0) < 1e-6
    assert abs(body["values"][-1] - 15.0) < 1e-6


def test_profile_endpoint_unknown_var_400(client: TestClient, run_with_h5: int) -> None:
    r = client.get(
        f"/api/runs/{run_with_h5}/outputs/demo.athdf/profile",
        params={"var": "missing", "x0": 0, "y0": 0, "x1": 1, "y1": 1},
    )
    assert r.status_code == 400


def test_profile_endpoint_415_on_non_h5(client: TestClient, tmp_path: Path) -> None:
    # Seed a run whose output is a .hst.
    from app import db as _db  # noqa: PLC0415
    from app.models import Build, BuildStatus, InputFile, Project, Run, RunStatus  # noqa: PLC0415
    from app.services import workspace  # noqa: PLC0415

    with _db.SessionLocal() as db:
        p = Project(name="p", slug="p")
        db.add(p)
        db.commit()
        db.refresh(p)
        workspace.ensure_layout(p.slug)
        b = Build(project_id=p.id, cmake_flags={}, status=BuildStatus.success)
        db.add(b)
        db.commit()
        db.refresh(b)
        i = InputFile(project_id=p.id, filename="x", content="")
        db.add(i)
        db.commit()
        db.refresh(i)
        run_dir = workspace.runs_dir(p.slug) / "1"
        run_dir.mkdir(parents=True, exist_ok=True)
        (run_dir / "out.hst").write_text("# [1]=t\n0\n")
        r = Run(
            build_id=b.id,
            input_file_id=i.id,
            status=RunStatus.success,
            output_dir=str(run_dir),
        )
        db.add(r)
        db.commit()
        rid = r.id
    resp = client.get(
        f"/api/runs/{rid}/outputs/out.hst/profile",
        params={"var": "rho", "x0": 0, "y0": 0, "x1": 1, "y1": 1},
    )
    assert resp.status_code == 415

"""End-to-end REST coverage of the .athdf /field + /variables endpoints."""

from __future__ import annotations

from pathlib import Path

import h5py
import numpy as np
import pytest
from fastapi.testclient import TestClient


def _seed_run_with_athdf(client: TestClient, body: bytes) -> tuple[int, Path]:
    """Create a project + build + run directly in the DB, writing an
    .athdf file into the run's output directory."""
    from app import db as _db  # noqa: PLC0415
    from app.models import Build, BuildStatus, InputFile, Project, Run, RunStatus  # noqa: PLC0415
    from app.services import workspace  # noqa: PLC0415

    with _db.SessionLocal() as db:
        project = Project(name="fld", slug="fld")
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
        out_path = run_dir / "demo.athdf"
        out_path.write_bytes(body)

        run = Run(
            build_id=build.id,
            input_file_id=inp.id,
            status=RunStatus.success,
            output_dir=str(run_dir),
        )
        db.add(run)
        db.commit()
        db.refresh(run)
        return run.id, out_path


@pytest.fixture
def run_with_h5(tmp_path: Path, client: TestClient) -> tuple[int, Path]:
    path = tmp_path / "demo.athdf"
    with h5py.File(path, "w") as f:
        f.create_dataset("rho", data=np.arange(4 * 8 * 16).reshape(4, 8, 16).astype("float32"))
    body = path.read_bytes()
    return _seed_run_with_athdf(client, body)


def test_list_field_variables_200(client: TestClient, run_with_h5) -> None:
    run_id, _ = run_with_h5
    r = client.get(f"/api/runs/{run_id}/outputs/demo.athdf/variables")
    assert r.status_code == 200
    assert "rho" in r.json()["variables"]


def test_list_field_variables_wrong_kind_415(client: TestClient) -> None:
    from app import db as _db  # noqa: PLC0415
    from app.models import Build, BuildStatus, InputFile, Project, Run, RunStatus  # noqa: PLC0415
    from app.services import workspace  # noqa: PLC0415

    with _db.SessionLocal() as db:
        p = Project(name="nonh5", slug="nonh5")
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
        (run_dir / "demo.hst").write_text("# hi\n0 0\n")
        r = Run(
            build_id=b.id,
            input_file_id=i.id,
            status=RunStatus.success,
            output_dir=str(run_dir),
        )
        db.add(r)
        db.commit()
        rid = r.id
    resp = client.get(f"/api/runs/{rid}/outputs/demo.hst/variables")
    assert resp.status_code == 415


def test_read_field_returns_shape(client: TestClient, run_with_h5) -> None:
    run_id, _ = run_with_h5
    r = client.get(f"/api/runs/{run_id}/outputs/demo.athdf/field?var=rho&axis=z&index=1")
    assert r.status_code == 200
    body = r.json()
    assert body["variable"] == "rho"
    assert body["axis"] == "z"
    assert body["index"] == 1
    assert len(body["z"]) == body["shape"][0]
    assert len(body["z"][0]) == body["shape"][1]


def test_read_field_unknown_var_400(client: TestClient, run_with_h5) -> None:
    run_id, _ = run_with_h5
    r = client.get(f"/api/runs/{run_id}/outputs/demo.athdf/field?var=no_such")
    assert r.status_code == 400


def test_read_field_on_non_h5_415(client: TestClient, run_with_h5) -> None:
    # Create a .hst in the same run dir and ask for /field on it.
    run_id, out = run_with_h5
    (out.parent / "extra.hst").write_text("# hi\n0 1\n")
    r = client.get(f"/api/runs/{run_id}/outputs/extra.hst/field?var=rho")
    assert r.status_code == 415

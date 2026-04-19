from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.services import builder, runner
from app.workers import tasks


@pytest.fixture(autouse=True)
def _fake_celery_infra(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """Stop the eager Celery task from calling real Redis / CMake / subprocess."""
    monkeypatch.setattr(tasks, "_redis", SimpleNamespace(publish=lambda *_: None))

    def fake_build(slug, problem_cpp, cmake_flags, log_path, publish=None, build_id=None):
        log_path.parent.mkdir(parents=True, exist_ok=True)
        log_path.write_text("[fake] configure\n[fake] build\n")
        binary = tmp_path / slug / "athena"
        binary.parent.mkdir(parents=True, exist_ok=True)
        binary.write_text("#!/bin/sh\necho fake")
        binary.chmod(0o755)
        return builder.BuildResult(success=True, binary_path=binary, returncode=0)

    def fake_run(binary_path, input_text, run_dir, log_path, publish=None, run_id=None):
        run_dir.mkdir(parents=True, exist_ok=True)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        log_path.write_text("[fake] run\n")
        return runner.RunResult(exit_code=0, output_dir=run_dir, pid=1234)

    monkeypatch.setattr(builder, "build", fake_build)
    monkeypatch.setattr(runner, "run_simulation", fake_run)


def _setup_project(client: TestClient) -> int:
    pid = client.post("/api/projects", json={"name": "demo"}).json()["id"]
    client.put(f"/api/projects/{pid}/problem", json={"content": "// ok"})
    return pid


def test_build_lifecycle(client: TestClient) -> None:
    pid = _setup_project(client)
    r = client.post(f"/api/projects/{pid}/builds", json={"cmake_flags": {}})
    assert r.status_code == 201
    build_id = r.json()["id"]
    # Route returns the "queued" row; the eager Celery task has since run.
    build = client.get(f"/api/builds/{build_id}").json()
    assert build["status"] == "success", build
    assert build["binary_path"]
    r = client.get(f"/api/projects/{pid}/builds")
    assert r.status_code == 200 and len(r.json()) == 1


def test_run_lifecycle_and_outputs(client: TestClient, tmp_path: Path) -> None:
    pid = _setup_project(client)
    build_id = client.post(f"/api/projects/{pid}/builds", json={}).json()["id"]
    inp = client.post(
        f"/api/projects/{pid}/inputs",
        json={"filename": "sod.athinput", "content": "<time>\ntlim=0.1\n"},
    ).json()

    r = client.post(f"/api/builds/{build_id}/runs", json={"input_file_id": inp["id"]})
    assert r.status_code == 201
    run_id = r.json()["id"]
    run = client.get(f"/api/runs/{run_id}").json()
    assert run["status"] == "success"
    assert run["exit_code"] == 0

    # Fabricate a .hst file in the run's output dir to test the outputs API.
    out_dir = Path(run["output_dir"])
    hst = out_dir / "demo.hst"
    hst.write_text("# [1]=time [2]=mass\n0.0 1.0\n0.1 1.0\n")

    r = client.get(f"/api/runs/{run_id}/outputs")
    names = [o["name"] for o in r.json()]
    assert "demo.hst" in names

    r = client.get(f"/api/runs/{run_id}/outputs/demo.hst/series")
    assert r.status_code == 200
    body = r.json()
    assert body["columns"] == ["time", "mass"]
    assert body["rows"] == [[0.0, 1.0], [0.1, 1.0]]


def test_path_traversal_rejected(client: TestClient) -> None:
    pid = _setup_project(client)
    build_id = client.post(f"/api/projects/{pid}/builds", json={}).json()["id"]
    inp = client.post(
        f"/api/projects/{pid}/inputs", json={"filename": "x.athinput", "content": ""}
    ).json()
    run_id = client.post(
        f"/api/builds/{build_id}/runs", json={"input_file_id": inp["id"]}
    ).json()["id"]
    r = client.get(f"/api/runs/{run_id}/outputs/..%2Fetc%2Fpasswd")
    assert r.status_code in (400, 404)

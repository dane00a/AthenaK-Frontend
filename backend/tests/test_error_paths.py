"""Negative-path coverage across resources."""
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.services import builder, runner
from app.workers import tasks


@pytest.fixture
def _fakes(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """Neutralise the Celery task side-effects for tests that enqueue builds."""
    monkeypatch.setattr(tasks, "_redis", SimpleNamespace(publish=lambda *_: None))
    monkeypatch.setattr(
        builder,
        "build",
        lambda slug, problem_cpp, cmake_flags, log_path, publish=None: builder.BuildResult(
            success=True, binary_path=tmp_path / slug / "athena", returncode=0
        ),
    )
    monkeypatch.setattr(
        runner,
        "run_simulation",
        lambda binary_path, input_text, run_dir, log_path, publish=None: runner.RunResult(
            exit_code=0, output_dir=run_dir, pid=1
        ),
    )


def test_project_validation_requires_name(client: TestClient) -> None:
    r = client.post("/api/projects", json={})
    assert r.status_code == 422


def test_project_empty_name_rejected(client: TestClient) -> None:
    r = client.post("/api/projects", json={"name": ""})
    assert r.status_code == 422


def test_patch_missing_project(client: TestClient) -> None:
    assert client.patch("/api/projects/9999", json={"name": "x"}).status_code == 404


def test_delete_missing_project(client: TestClient) -> None:
    assert client.delete("/api/projects/9999").status_code == 404


def test_problem_on_missing_project(client: TestClient) -> None:
    r = client.get("/api/projects/9999/problem")
    assert r.status_code == 404


def test_wizard_on_missing_project(client: TestClient) -> None:
    r = client.post("/api/projects/9999/problem/from-wizard", json={})
    assert r.status_code == 404


def test_input_filename_required(client: TestClient) -> None:
    pid = client.post("/api/projects", json={"name": "p"}).json()["id"]
    r = client.post(f"/api/projects/{pid}/inputs", json={"filename": ""})
    assert r.status_code == 422


def test_input_update_missing(client: TestClient) -> None:
    assert client.put("/api/inputs/9999", json={"content": "x"}).status_code == 404


def test_input_list_missing_project(client: TestClient) -> None:
    assert client.get("/api/projects/9999/inputs").status_code == 404


def test_build_on_missing_project(client: TestClient) -> None:
    r = client.post("/api/projects/9999/builds", json={})
    assert r.status_code == 404


def test_run_on_missing_build(client: TestClient) -> None:
    r = client.post("/api/builds/9999/runs", json={"input_file_id": 1})
    assert r.status_code == 404


def test_run_with_missing_input(client: TestClient, _fakes: None) -> None:
    pid = client.post("/api/projects", json={"name": "demo"}).json()["id"]
    client.put(f"/api/projects/{pid}/problem", json={"content": "// ok"})
    build_id = client.post(f"/api/projects/{pid}/builds", json={}).json()["id"]
    r = client.post(f"/api/builds/{build_id}/runs", json={"input_file_id": 9999})
    assert r.status_code == 404


def test_series_on_missing_run(client: TestClient) -> None:
    assert (
        client.get("/api/runs/9999/outputs/whatever.hst/series").status_code == 404
    )

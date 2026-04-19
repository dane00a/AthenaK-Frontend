from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.services import builder, runner
from app.workers import tasks


@pytest.fixture(autouse=True)
def _fakes(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setattr(tasks, "_redis", SimpleNamespace(publish=lambda *_: None))

    def fake_build(slug, problem_cpp, cmake_flags, log_path, publish=None, build_id=None):
        log_path.parent.mkdir(parents=True, exist_ok=True)
        log_path.write_text("ok\n")
        binary = tmp_path / slug / "athena"
        binary.parent.mkdir(parents=True, exist_ok=True)
        binary.write_text("fake")
        return builder.BuildResult(success=True, binary_path=binary, returncode=0)

    def fake_run(binary_path, input_text, run_dir, log_path, publish=None, run_id=None):
        run_dir.mkdir(parents=True, exist_ok=True)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        log_path.write_text("ok\n")
        return runner.RunResult(exit_code=0, output_dir=run_dir, pid=1)

    monkeypatch.setattr(builder, "build", fake_build)
    monkeypatch.setattr(runner, "run_simulation", fake_run)


def test_second_build_without_changes_reuses_first(client: TestClient) -> None:
    pid = client.post("/api/projects", json={"name": "skip"}).json()["id"]
    client.put(f"/api/projects/{pid}/problem", json={"content": "// v1"})
    b1_id = client.post(f"/api/projects/{pid}/builds", json={}).json()["id"]
    b1 = client.get(f"/api/builds/{b1_id}").json()
    assert b1["status"] == "success"

    b2_id = client.post(f"/api/projects/{pid}/builds", json={}).json()["id"]
    b2 = client.get(f"/api/builds/{b2_id}").json()
    assert b2["status"] == "success"
    assert b2["reused_from"] == b1["id"]
    assert b2["binary_path"] == b1["binary_path"]


def test_changed_source_triggers_real_build(client: TestClient) -> None:
    pid = client.post("/api/projects", json={"name": "change"}).json()["id"]
    client.put(f"/api/projects/{pid}/problem", json={"content": "// v1"})
    client.post(f"/api/projects/{pid}/builds", json={})
    client.put(f"/api/projects/{pid}/problem", json={"content": "// v2"})
    b2_id = client.post(f"/api/projects/{pid}/builds", json={}).json()["id"]
    assert client.get(f"/api/builds/{b2_id}").json()["reused_from"] is None


def test_different_flags_trigger_real_build(client: TestClient) -> None:
    pid = client.post("/api/projects", json={"name": "flags"}).json()["id"]
    client.put(f"/api/projects/{pid}/problem", json={"content": "// fixed"})
    client.post(f"/api/projects/{pid}/builds", json={"cmake_flags": {}})
    b2_id = client.post(
        f"/api/projects/{pid}/builds", json={"cmake_flags": {"Athena_ENABLE_MPI": True}}
    ).json()["id"]
    assert client.get(f"/api/builds/{b2_id}").json()["reused_from"] is None

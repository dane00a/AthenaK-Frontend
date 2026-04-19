import subprocess
import time
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.services import builder, process_registry, runner
from app.workers import tasks


@pytest.fixture(autouse=True)
def _fakes(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setattr(tasks, "_redis", SimpleNamespace(publish=lambda *_: None))

    def fake_build(slug, problem_cpp, cmake_flags, log_path, publish=None, build_id=None):
        log_path.parent.mkdir(parents=True, exist_ok=True)
        log_path.write_text("ok\n")
        binary = tmp_path / slug / "athena"
        binary.parent.mkdir(parents=True, exist_ok=True)
        binary.write_text("#!/bin/sh\necho hi")
        binary.chmod(0o755)
        return builder.BuildResult(
            success=True, binary_path=binary, returncode=0, cancelled=False
        )

    def fake_run(binary_path, input_text, run_dir, log_path, publish=None, run_id=None):
        run_dir.mkdir(parents=True, exist_ok=True)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        log_path.write_text("ok\n")
        return runner.RunResult(exit_code=0, output_dir=run_dir, pid=1, cancelled=False)

    monkeypatch.setattr(builder, "build", fake_build)
    monkeypatch.setattr(runner, "run_simulation", fake_run)


def test_cancel_completed_build_is_409(client: TestClient) -> None:
    pid = client.post("/api/projects", json={"name": "x"}).json()["id"]
    client.put(f"/api/projects/{pid}/problem", json={"content": "// ok"})
    build_id = client.post(f"/api/projects/{pid}/builds", json={}).json()["id"]
    # eager task already finished with status=success
    r = client.post(f"/api/builds/{build_id}/cancel")
    assert r.status_code == 409


def test_cancel_unknown_build_404(client: TestClient) -> None:
    assert client.post("/api/builds/9999/cancel").status_code == 404


def test_delete_run_removes_row_and_outputs(client: TestClient, tmp_path: Path) -> None:
    pid = client.post("/api/projects", json={"name": "drun"}).json()["id"]
    client.put(f"/api/projects/{pid}/problem", json={"content": "// ok"})
    build = client.post(f"/api/projects/{pid}/builds", json={}).json()
    inp = client.post(
        f"/api/projects/{pid}/inputs", json={"filename": "i.athinput", "content": ""}
    ).json()
    run = client.post(
        f"/api/builds/{build['id']}/runs", json={"input_file_id": inp["id"]}
    ).json()
    run = client.get(f"/api/runs/{run['id']}").json()
    out_dir = Path(run["output_dir"])
    # drop a fake output file so we can confirm it's removed
    (out_dir / "demo.hst").write_text("hi\n")

    r = client.delete(f"/api/runs/{run['id']}")
    assert r.status_code == 204
    assert client.get(f"/api/runs/{run['id']}").status_code == 404
    assert not out_dir.exists()


def test_delete_running_run_is_409(client: TestClient) -> None:
    # Poke a row directly into 'running' and try to delete it.
    from app import db as _db  # noqa: PLC0415
    from app.models import Build, InputFile, Project, Run, RunStatus  # noqa: PLC0415

    with _db.SessionLocal() as db:
        project = Project(name="x", slug="x")
        db.add(project)
        db.commit()
        db.refresh(project)
        build = Build(project_id=project.id, cmake_flags={})
        db.add(build)
        db.commit()
        db.refresh(build)
        inp = InputFile(project_id=project.id, filename="x", content="")
        db.add(inp)
        db.commit()
        db.refresh(inp)
        run = Run(build_id=build.id, input_file_id=inp.id, status=RunStatus.running)
        db.add(run)
        db.commit()
        db.refresh(run)
        run_id = run.id

    assert client.delete(f"/api/runs/{run_id}").status_code == 409


def test_process_registry_terminates_child() -> None:
    # Sanity for the signal path — start a slow sleep and cancel it.
    proc = subprocess.Popen(
        ["sh", "-c", "sleep 30"], stdout=subprocess.PIPE, stderr=subprocess.STDOUT
    )
    process_registry.register_build(999, proc)
    try:
        assert process_registry.cancel_build(999) is True
        # Give SIGTERM a moment
        for _ in range(20):
            if proc.poll() is not None:
                break
            time.sleep(0.1)
        assert proc.poll() is not None
    finally:
        process_registry.unregister_build(999)
        if proc.poll() is None:
            proc.kill()

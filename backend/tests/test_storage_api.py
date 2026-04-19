from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app import config as config_module
from app.services import builder, runner, storage, workspace
from app.workers import tasks


@pytest.fixture(autouse=True)
def _fakes(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setattr(tasks, "_redis", SimpleNamespace(publish=lambda *_: None))
    monkeypatch.setattr(config_module.settings, "athenak_cache_dir", tmp_path)

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
        (run_dir / "demo.hst").write_text("x\n")
        return runner.RunResult(exit_code=0, output_dir=run_dir, pid=1)

    monkeypatch.setattr(builder, "build", fake_build)
    monkeypatch.setattr(runner, "run_simulation", fake_run)


def _make_project_with_runs(client: TestClient, n: int) -> tuple[int, list[int]]:
    pid = client.post("/api/projects", json={"name": "retain"}).json()["id"]
    client.put(f"/api/projects/{pid}/problem", json={"content": "// ok"})
    build = client.post(f"/api/projects/{pid}/builds", json={}).json()
    inp = client.post(
        f"/api/projects/{pid}/inputs", json={"filename": "i.athinput", "content": ""}
    ).json()
    run_ids: list[int] = []
    for _ in range(n):
        r = client.post(f"/api/builds/{build['id']}/runs", json={"input_file_id": inp["id"]})
        run_ids.append(r.json()["id"])
    return pid, run_ids


def test_storage_report_shape(client: TestClient) -> None:
    pid, _ = _make_project_with_runs(client, 1)
    r = client.get(f"/api/projects/{pid}/storage").json()
    assert "total_bytes" in r and "run_bytes" in r
    assert r["total_bytes"] >= 0


def test_purge_run_removes_dir(client: TestClient) -> None:
    pid, run_ids = _make_project_with_runs(client, 1)
    slug = client.get(f"/api/projects/{pid}").json()["slug"]
    assert (workspace.runs_dir(slug) / str(run_ids[0])).exists()
    r = client.delete(f"/api/runs/{run_ids[0]}/purge")
    assert r.status_code == 200 and r.json()["purged"] is True
    assert not (workspace.runs_dir(slug) / str(run_ids[0])).exists()


def test_retention_keep_last_n_prunes_older(client: TestClient) -> None:
    pid = client.post("/api/projects", json={"name": "keep"}).json()["id"]
    client.put(f"/api/projects/{pid}/problem", json={"content": "// ok"})
    assert (
        client.put(
            f"/api/projects/{pid}/retention", json={"kind": "keep_last_n", "n": 2}
        ).status_code
        == 200
    )

    build = client.post(f"/api/projects/{pid}/builds", json={}).json()
    inp = client.post(
        f"/api/projects/{pid}/inputs", json={"filename": "i.athinput", "content": ""}
    ).json()
    run_ids: list[int] = []
    for _ in range(4):
        run_ids.append(
            client.post(
                f"/api/builds/{build['id']}/runs", json={"input_file_id": inp["id"]}
            ).json()["id"]
        )

    slug = client.get(f"/api/projects/{pid}").json()["slug"]
    surviving = sorted(int(p.name) for p in workspace.runs_dir(slug).iterdir() if p.is_dir())
    # Retention policy `keep_last_n=2` keeps the newest 2 runs — plus the
    # just-finished run is always protected.
    assert set(surviving).issubset(set(run_ids[-2:]))
    assert len(surviving) <= 2


def test_apply_retention_unit(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(config_module.settings, "athenak_cache_dir", tmp_path)
    workspace.ensure_layout("p")
    for i in range(1, 6):
        d = workspace.runs_dir("p") / str(i)
        d.mkdir()
        (d / "x").write_text("x")
    purged = storage.apply_retention("p", {"kind": "keep_last_n", "n": 2})
    assert purged == [1, 2, 3]
    assert sorted(int(p.name) for p in workspace.runs_dir("p").iterdir()) == [4, 5]

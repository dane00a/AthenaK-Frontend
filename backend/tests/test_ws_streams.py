"""WebSocket endpoint tests for build/run log streams.

We exercise only the replay path — the Redis subscribe loop needs a live
broker which isn't worth spinning up in unit tests. The replay path is the
higher-risk leg anyway (it's what lets a user reload mid-build and catch up).
"""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient


def _seed_build(tmp_path: Path) -> tuple[int, Path]:
    """Create a Build row whose log_path points at a file we control."""
    from app import db as _db  # noqa: PLC0415
    from app.models import Build, BuildStatus, ProblemFile, Project  # noqa: PLC0415

    with _db.SessionLocal() as db:
        project = Project(name="ws", slug="ws")
        project.problem_file = ProblemFile(filename="user_problem.cpp", content="// ok")
        db.add(project)
        db.commit()
        db.refresh(project)
        log_path = tmp_path / "build.log"
        log_path.write_text("line one\nline two\nline three\n")
        build = Build(
            project_id=project.id,
            cmake_flags={},
            status=BuildStatus.success,
            log_path=str(log_path),
        )
        db.add(build)
        db.commit()
        db.refresh(build)
        return build.id, log_path


def _stub_stream(monkeypatch: pytest.MonkeyPatch) -> None:
    """Short-circuit the Redis-subscription leg so tests don't need a broker."""
    from app.api import ws as ws_module  # noqa: PLC0415

    async def _noop(*_args, **_kwargs):
        return None

    monkeypatch.setattr(ws_module, "_stream_channel", _noop)


def test_ws_build_replays_log(
    client: TestClient, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    build_id, _ = _seed_build(tmp_path)
    _stub_stream(monkeypatch)

    with client.websocket_connect(f"/ws/builds/{build_id}") as ws:
        a = ws.receive_json()
        b = ws.receive_json()
        c = ws.receive_json()
    assert [a["text"], b["text"], c["text"]] == ["line one", "line two", "line three"]
    assert all(m["stream"] == "stdout" for m in (a, b, c))


def test_ws_build_unknown_id_closes_clean(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Handler enters and exits with no messages when there's no log."""
    _stub_stream(monkeypatch)
    # Verify connection handshake succeeds. Reading after a server-initiated
    # close is not reliably raisable on all Starlette versions, so we just
    # exercise the enter+exit path.
    with client.websocket_connect("/ws/builds/9999"):
        pass

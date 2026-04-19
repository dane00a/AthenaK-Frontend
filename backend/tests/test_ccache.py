import io
from pathlib import Path

import pytest

from app import config as config_module
from app.services import builder


@pytest.fixture
def fake_upstream(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    cache = tmp_path / "cache"
    (cache / "upstream" / "athenak" / ".git").mkdir(parents=True)
    (cache / "upstream" / "athenak" / "src" / "pgen").mkdir(parents=True)
    monkeypatch.setattr(config_module.settings, "athenak_cache_dir", cache)
    return cache


def test_ccache_added_when_available(fake_upstream: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """When `ccache` is on PATH, the builder sets CMAKE_*_COMPILER_LAUNCHER=ccache."""
    recorded_cmds: list[list[str]] = []

    class _Proc:
        def __init__(self) -> None:
            self.stdout = io.StringIO("")

        def wait(self) -> int:
            return 0

    def fake_popen(cmd, *args, **kwargs):  # noqa: ANN002, ANN003
        recorded_cmds.append(list(cmd))
        return _Proc()

    monkeypatch.setattr(builder.subprocess, "Popen", fake_popen)
    monkeypatch.setattr(
        builder.shutil,
        "which",
        lambda name: "/usr/bin/ccache" if name == "ccache" else None,
    )
    # Pretend the athena binary exists for the success branch.
    out_bin = fake_upstream / "workspaces/p/build/src/athena"
    out_bin.parent.mkdir(parents=True, exist_ok=True)
    out_bin.write_text("fake")

    log = fake_upstream / "log"
    builder.build("p", "// hi", {}, log)
    # Expect two cmake invocations, the first of which carries -DCMAKE_CXX_COMPILER_LAUNCHER=ccache.
    assert recorded_cmds, "builder never invoked cmake"
    flat = " ".join(recorded_cmds[0])
    assert "-DCMAKE_CXX_COMPILER_LAUNCHER=ccache" in flat
    assert "-DCMAKE_C_COMPILER_LAUNCHER=ccache" in flat


def test_ccache_not_added_when_absent(fake_upstream: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    recorded_cmds: list[list[str]] = []

    class _Proc:
        def __init__(self) -> None:
            self.stdout = io.StringIO("")

        def wait(self) -> int:
            return 0

    def fake_popen(cmd, *args, **kwargs):  # noqa: ANN002, ANN003
        recorded_cmds.append(list(cmd))
        return _Proc()

    monkeypatch.setattr(builder.subprocess, "Popen", fake_popen)
    monkeypatch.setattr(builder.shutil, "which", lambda name: None)
    out_bin = fake_upstream / "workspaces/p/build/src/athena"
    out_bin.parent.mkdir(parents=True, exist_ok=True)
    out_bin.write_text("fake")

    builder.build("p", "// hi", {}, fake_upstream / "log")
    flat = " ".join(recorded_cmds[0])
    assert "COMPILER_LAUNCHER=ccache" not in flat

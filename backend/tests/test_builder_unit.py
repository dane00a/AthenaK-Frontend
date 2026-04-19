"""Unit tests for services/builder that don't invoke cmake.

These patch subprocess.Popen so we can check lifecycle invariants — the
staged user_problem.cpp is always removed, logs flow to the file sink,
and cmake flags are correctly formatted.
"""
from __future__ import annotations

import io
from pathlib import Path

import pytest

from app import config as config_module
from app.services import athenak_repo, builder


@pytest.fixture
def fake_upstream(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    cache = tmp_path / "cache"
    (cache / "upstream" / "athenak" / ".git").mkdir(parents=True)
    (cache / "upstream" / "athenak" / "src" / "pgen").mkdir(parents=True)
    monkeypatch.setattr(config_module.settings, "athenak_cache_dir", cache)
    return cache


class _FakeProc:
    def __init__(self, lines: list[str], returncode: int) -> None:
        self.stdout = io.StringIO("\n".join(lines) + ("\n" if lines else ""))
        self._rc = returncode

    def wait(self) -> int:
        return self._rc


def _make_fake_popen(queue: list[_FakeProc]):
    def fake_popen(*_args, **_kwargs):  # noqa: ANN002, ANN003
        return queue.pop(0)

    return fake_popen


def test_format_flags_renders_bools_and_strings() -> None:
    flags = builder._format_flags({"A": True, "B": False, "C": "Release"})  # noqa: SLF001
    assert flags == ["-DA=ON", "-DB=OFF", "-DC=Release"]


def test_cleanup_removes_staged_pgen_on_success(
    fake_upstream: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    queue = [_FakeProc(["-- configure ok"], 0), _FakeProc(["[100%] built"], 0)]
    monkeypatch.setattr(builder.subprocess, "Popen", _make_fake_popen(queue))

    # Create the expected binary path so the success branch lights up.
    def ensure_bin(*_a, **_k):  # noqa: ANN002, ANN003
        bin_path = (
            config_module.settings.workspaces_dir / "proj" / "build" / "src" / "athena"
        )
        bin_path.parent.mkdir(parents=True, exist_ok=True)
        bin_path.write_text("fake")

    # Invoke ensure_bin between configure and build by hooking the second proc.
    queue[1] = _FakeProc(["[100%] built"], 0)
    # Easier: create the binary up front; builder only reads it after build.
    ensure_bin()

    log = tmp_path / "build.log"
    captured: list[str] = []
    result = builder.build("proj", "// ok", {}, log, publish=captured.append)

    assert result.success
    assert result.binary_path and result.binary_path.name == "athena"
    assert not athenak_repo.staged_pgen_path().exists()
    assert log.read_text().count("\n") >= 2
    assert any("configure ok" in line for line in captured)


def test_cleanup_removes_staged_pgen_on_configure_failure(
    fake_upstream: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    queue = [_FakeProc(["-- error: bad"], 2)]
    monkeypatch.setattr(builder.subprocess, "Popen", _make_fake_popen(queue))

    log = tmp_path / "build.log"
    result = builder.build("proj", "// ok", {}, log)

    assert not result.success
    assert result.returncode == 2
    # Critical invariant: the transient file must be unstaged even on failure.
    assert not athenak_repo.staged_pgen_path().exists()


def test_cleanup_on_exception(
    fake_upstream: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    def boom(*_a, **_k):  # noqa: ANN002, ANN003
        raise RuntimeError("oh no")

    monkeypatch.setattr(builder.subprocess, "Popen", boom)
    log = tmp_path / "build.log"
    with pytest.raises(RuntimeError):
        builder.build("proj", "// ok", {}, log)
    assert not athenak_repo.staged_pgen_path().exists()

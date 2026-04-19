"""Extra cancel-path regressions.

The signal path is covered end-to-end by test_cancel.py::
test_process_registry_terminates_child (real subprocess + SIGTERM).
This module focuses on the paths around that — unregistered ids,
builder book-keeping, and opt-out of the registry.
"""

from __future__ import annotations

import io
import subprocess
from pathlib import Path

import pytest

from app import config as config_module
from app.services import builder, process_registry


@pytest.fixture
def fake_upstream(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    cache = tmp_path / "cache"
    (cache / "upstream" / "athenak" / ".git").mkdir(parents=True)
    (cache / "upstream" / "athenak" / "src" / "pgen").mkdir(parents=True)
    monkeypatch.setattr(config_module.settings, "athenak_cache_dir", cache)
    return cache


def test_cancel_unregistered_is_noop() -> None:
    """cancel_build on an unknown id returns False — no crash."""
    assert process_registry.cancel_build(99_999_999) is False


def test_format_flags_passes_through_launcher_flags() -> None:
    """Regression: user-supplied compiler launcher is not overridden."""
    flags = builder._format_flags(  # noqa: SLF001
        {"CMAKE_CXX_COMPILER_LAUNCHER": "sccache", "PROBLEM": "user_problem"}
    )
    assert "-DCMAKE_CXX_COMPILER_LAUNCHER=sccache" in flags
    assert "-DPROBLEM=user_problem" in flags


class _Discard:
    def __init__(self) -> None:
        self.stdout = io.StringIO("")

    def wait(self) -> int:
        return 0


def test_build_without_build_id_does_not_register(
    fake_upstream: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Regression: build(..., build_id=None) skips registry calls cleanly."""
    monkeypatch.setattr(builder.subprocess, "Popen", lambda *_a, **_kw: _Discard())
    out_bin = fake_upstream / "workspaces/p/build/src/athena"
    out_bin.parent.mkdir(parents=True, exist_ok=True)
    out_bin.write_text("fake")
    builder.build("p", "// ok", {}, tmp_path / "log")
    # No entry should have been added; cancel_build on an arbitrary id is still a no-op.
    assert process_registry.cancel_build(0) is False


def test_register_then_cancel_returns_true() -> None:
    """After register_build, cancel_build returns True even if the process
    has already exited (idempotent)."""
    proc = subprocess.Popen(["true"], stdout=subprocess.PIPE, text=True)
    process_registry.register_build(7777, proc)
    try:
        proc.wait()
        assert process_registry.cancel_build(7777) is True
        assert process_registry.was_build_cancelled(7777) is True
    finally:
        process_registry.unregister_build(7777)

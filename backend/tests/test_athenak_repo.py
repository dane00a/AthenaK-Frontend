"""Tests for the upstream-clone wrapper in services/athenak_repo."""
from __future__ import annotations

from pathlib import Path

import pytest

from app import config as config_module
from app.services import athenak_repo


@pytest.fixture
def fake_cache(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    monkeypatch.setattr(config_module.settings, "athenak_cache_dir", tmp_path)
    return tmp_path


def test_is_cloned_false_before_clone(fake_cache: Path) -> None:
    assert not athenak_repo.is_cloned()


def test_ensure_cloned_raises_when_missing(fake_cache: Path) -> None:
    with pytest.raises(RuntimeError, match="not cloned"):
        athenak_repo.ensure_cloned()


def test_ensure_cloned_returns_path_when_present(fake_cache: Path) -> None:
    (fake_cache / "upstream" / "athenak" / ".git").mkdir(parents=True)
    assert athenak_repo.ensure_cloned() == config_module.settings.upstream_dir


def test_reset_pgen_is_noop_when_missing(fake_cache: Path) -> None:
    athenak_repo.reset_pgen()  # must not raise


def test_reset_pgen_removes_staged_file(fake_cache: Path) -> None:
    staged = athenak_repo.staged_pgen_path()
    staged.parent.mkdir(parents=True)
    staged.write_text("// stale")
    assert staged.exists()
    athenak_repo.reset_pgen()
    assert not staged.exists()


def test_upstream_lock_is_reentrant_same_process(fake_cache: Path) -> None:
    # FileLock defaults to recursive within a single thread.
    with athenak_repo.upstream_lock(), athenak_repo.upstream_lock():
        pass

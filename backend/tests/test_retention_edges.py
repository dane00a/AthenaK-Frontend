"""Edge cases for services.storage.apply_retention."""

from __future__ import annotations

from pathlib import Path

import pytest

from app import config as config_module
from app.services import storage, workspace


@pytest.fixture
def slug_with_runs(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    def _mk(ids: list[int]) -> str:
        monkeypatch.setattr(config_module.settings, "athenak_cache_dir", tmp_path)
        workspace.ensure_layout("edge")
        for i in ids:
            d = workspace.runs_dir("edge") / str(i)
            d.mkdir()
            (d / "blob").write_text("x")
        return "edge"

    return _mk


def test_keep_last_n_equal_1_keeps_only_newest(slug_with_runs) -> None:
    slug = slug_with_runs([1, 2, 3, 4, 5])
    purged = storage.apply_retention(slug, {"kind": "keep_last_n", "n": 1})
    assert purged == [1, 2, 3, 4]
    assert [int(p.name) for p in workspace.runs_dir(slug).iterdir()] == [5]


def test_keep_last_n_larger_than_existing_is_noop(slug_with_runs) -> None:
    slug = slug_with_runs([1, 2])
    purged = storage.apply_retention(slug, {"kind": "keep_last_n", "n": 10})
    assert purged == []
    assert sorted(int(p.name) for p in workspace.runs_dir(slug).iterdir()) == [1, 2]


def test_protect_run_id_keeps_target_alive(slug_with_runs) -> None:
    slug = slug_with_runs([1, 2, 3, 4])
    # keep_last_n=1 would prune {1,2,3}; protect run 2 anyway.
    purged = storage.apply_retention(slug, {"kind": "keep_last_n", "n": 1}, protect_run_id=2)
    assert 4 not in purged and 2 not in purged
    remaining = sorted(int(p.name) for p in workspace.runs_dir(slug).iterdir())
    assert 2 in remaining and 4 in remaining


def test_never_policy_is_noop(slug_with_runs) -> None:
    slug = slug_with_runs([1, 2, 3])
    assert storage.apply_retention(slug, {"kind": "never"}) == []
    assert len(list(workspace.runs_dir(slug).iterdir())) == 3


def test_unknown_policy_is_noop(slug_with_runs) -> None:
    slug = slug_with_runs([1, 2])
    assert storage.apply_retention(slug, {"kind": "wut"}) == []


def test_bad_n_value_is_clamped_by_validator(slug_with_runs) -> None:
    slug = slug_with_runs([1, 2, 3])
    # n<1 should be rejected by the service (no-op), not silently delete everything.
    assert storage.apply_retention(slug, {"kind": "keep_last_n", "n": 0}) == []

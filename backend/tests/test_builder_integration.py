"""End-to-end test of services/builder against a miniature fake AthenaK.

This does not run real AthenaK — it confirms the stage/configure/build/
unstage pipeline works end-to-end with a stand-in CMake project that
mirrors the upstream layout:

  fake-athenak/
    CMakeLists.txt                 # uses PROBLEM cache variable
    src/
      CMakeLists.txt               # builds athena from user_problem.cpp
      pgen/
        (user_problem.cpp staged here)

Skipped on systems without cmake/a C++ compiler in PATH.
"""
from __future__ import annotations

import shutil
from pathlib import Path

import pytest

from app import config as config_module
from app.services import athenak_repo, builder

pytestmark = pytest.mark.skipif(
    shutil.which("cmake") is None or shutil.which("c++") is None,
    reason="cmake or C++ compiler not available",
)


FAKE_ROOT_CMAKELISTS = """\
cmake_minimum_required(VERSION 3.16)
project(fake_athenak CXX)
set(CMAKE_CXX_STANDARD 17)
set(PROBLEM "built_in_pgens" CACHE STRING "problem generator name")
add_subdirectory(src)
"""

FAKE_SRC_CMAKELISTS = """\
add_executable(athena pgen/${PROBLEM}.cpp)
"""

FAKE_BUILTIN_PGEN = """\
#include <iostream>
int main(){ std::cout << "hello from built_in_pgens" << std::endl; return 0; }
"""

USER_PROBLEM_CPP = """\
#include <iostream>
int main(){ std::cout << "hello from user_problem" << std::endl; return 0; }
"""


@pytest.fixture
def fake_upstream(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    # Build the miniature tree.
    cache = tmp_path / "athenak-cache"
    upstream = cache / "upstream" / "athenak"
    (upstream / "src" / "pgen").mkdir(parents=True)
    (upstream / "CMakeLists.txt").write_text(FAKE_ROOT_CMAKELISTS)
    (upstream / "src" / "CMakeLists.txt").write_text(FAKE_SRC_CMAKELISTS)
    (upstream / "src" / "pgen" / "built_in_pgens.cpp").write_text(FAKE_BUILTIN_PGEN)
    # Initialise a dummy git repo so ``is_cloned()`` returns True.
    (upstream / ".git").mkdir()

    monkeypatch.setattr(config_module.settings, "athenak_cache_dir", cache)
    # No multi-project parallelism in this test, so the lock path auto-heals.
    return upstream


def test_build_runs_user_problem_cpp(fake_upstream: Path, tmp_path: Path) -> None:
    log_path = tmp_path / "build.log"
    result = builder.build(
        slug="proj",
        problem_cpp=USER_PROBLEM_CPP,
        cmake_flags={},
        log_path=log_path,
    )
    assert result.success, log_path.read_text()
    assert result.binary_path is not None
    assert result.binary_path.exists()
    # Post-condition from CLAUDE.md §4: user_problem.cpp must be removed.
    assert not athenak_repo.staged_pgen_path().exists()

    # And the staged binary should actually execute.
    out = builder.subprocess.run(
        [str(result.binary_path)], capture_output=True, text=True, check=True
    )
    assert "user_problem" in out.stdout

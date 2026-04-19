"""CMake + ``cmake --build`` orchestration for user-authored problem files.

Flow (see CLAUDE.md §5.2):

1. Acquire the upstream file lock.
2. Stage ``user_problem.cpp`` into ``upstream/athenak/src/pgen/``.
3. Configure and build into ``workspaces/<slug>/build``.
4. Stream lines to ``log_path`` and to a callback (typically a Redis publisher).
5. Always unstage and release the lock.
"""

from __future__ import annotations

import subprocess
from collections.abc import Callable, Iterable
from dataclasses import dataclass
from pathlib import Path

from ..config import settings
from . import athenak_repo, workspace

LogSink = Callable[[str], None]


@dataclass
class BuildResult:
    success: bool
    binary_path: Path | None
    returncode: int


def _format_flags(flags: dict[str, str | bool]) -> list[str]:
    out: list[str] = []
    for k, v in flags.items():
        if isinstance(v, bool):
            out.append(f"-D{k}={'ON' if v else 'OFF'}")
        else:
            out.append(f"-D{k}={v}")
    return out


def _stream(cmd: list[str], cwd: Path, sinks: Iterable[LogSink]) -> int:
    proc = subprocess.Popen(
        cmd,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        bufsize=1,
        text=True,
    )
    assert proc.stdout is not None
    for line in proc.stdout:
        for sink in sinks:
            sink(line.rstrip("\n"))
    return proc.wait()


def build(
    slug: str,
    problem_cpp: str,
    cmake_flags: dict[str, str | bool],
    log_path: Path,
    publish: LogSink | None = None,
) -> BuildResult:
    workspace.ensure_layout(slug)
    log_path.parent.mkdir(parents=True, exist_ok=True)

    with log_path.open("a", encoding="utf-8") as log_fp:

        def to_log(line: str) -> None:
            log_fp.write(line + "\n")
            log_fp.flush()

        sinks: list[LogSink] = [to_log]
        if publish:
            sinks.append(publish)

        with athenak_repo.upstream_lock():
            athenak_repo.ensure_cloned()
            staged = athenak_repo.staged_pgen_path()
            staged.parent.mkdir(parents=True, exist_ok=True)
            staged.write_text(problem_cpp, encoding="utf-8")

            try:
                flags = {"PROBLEM": "user_problem", "CMAKE_BUILD_TYPE": "Release"}
                flags.update(cmake_flags)

                configure_cmd = [
                    "cmake",
                    "-S",
                    str(settings.upstream_dir),
                    "-B",
                    str(workspace.build_dir(slug)),
                    *_format_flags(flags),
                ]
                rc = _stream(configure_cmd, workspace.project_dir(slug), sinks)
                if rc != 0:
                    return BuildResult(success=False, binary_path=None, returncode=rc)

                build_cmd = [
                    "cmake",
                    "--build",
                    str(workspace.build_dir(slug)),
                    "-j",
                    str(settings.nproc),
                ]
                rc = _stream(build_cmd, workspace.project_dir(slug), sinks)
                if rc != 0:
                    return BuildResult(success=False, binary_path=None, returncode=rc)
            finally:
                if staged.exists():
                    staged.unlink()

    # The athena binary lands under build/src/athena for current AthenaK;
    # fall back to a glob if upstream relocates it.
    primary = workspace.build_dir(slug) / "src" / "athena"
    if primary.exists():
        return BuildResult(success=True, binary_path=primary, returncode=0)
    matches = list(workspace.build_dir(slug).rglob("athena"))
    binary = next((m for m in matches if m.is_file()), None)
    return BuildResult(success=binary is not None, binary_path=binary, returncode=0)

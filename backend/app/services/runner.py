"""Launch a built AthenaK binary against an .athinput file and stream its output."""

from __future__ import annotations

import subprocess
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

from . import process_registry

LogSink = Callable[[str], None]


@dataclass
class RunResult:
    exit_code: int
    output_dir: Path
    pid: int
    cancelled: bool = False


def run_simulation(
    binary_path: Path,
    input_text: str,
    run_dir: Path,
    log_path: Path,
    publish: LogSink | None = None,
    run_id: int | None = None,
) -> RunResult:
    run_dir.mkdir(parents=True, exist_ok=True)
    input_path = run_dir / "input.athinput"
    input_path.write_text(input_text, encoding="utf-8")

    with log_path.open("a", encoding="utf-8") as log_fp:

        def to_log(line: str) -> None:
            log_fp.write(line + "\n")
            log_fp.flush()

        sinks: list[LogSink] = [to_log]
        if publish:
            sinks.append(publish)

        proc = subprocess.Popen(
            [str(binary_path), "-i", str(input_path)],
            cwd=run_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            bufsize=1,
            text=True,
        )
        if run_id is not None:
            process_registry.register_run(run_id, proc)
        try:
            assert proc.stdout is not None
            pid = proc.pid
            for line in proc.stdout:
                text = line.rstrip("\n")
                for sink in sinks:
                    sink(text)
            rc = proc.wait()
        finally:
            if run_id is not None:
                process_registry.unregister_run(run_id)

    cancelled = run_id is not None and process_registry.was_run_cancelled(run_id)
    return RunResult(exit_code=rc, output_dir=run_dir, pid=pid, cancelled=cancelled)


def list_outputs(run_dir: Path) -> list[Path]:
    """Return output files AthenaK may have produced in the run dir."""
    patterns = ("*.hst", "*.tab", "*.bin", "*.athdf", "*.rst")
    out: list[Path] = []
    for pat in patterns:
        out.extend(sorted(run_dir.glob(pat)))
    return out

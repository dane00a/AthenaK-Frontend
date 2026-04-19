"""In-process registry that lets an HTTP handler cancel a Celery task's child.

Celery tasks execute in the worker process, but the `/cancel` HTTP call lands
in the FastAPI process. Those are the *same* process in the current deployment
(eager mode in tests, same worker for `make dev`), so we can share a module-
level mapping. When we split workers out, this becomes a Redis pub/sub.
"""
from __future__ import annotations

import signal
import subprocess
import threading
import time
from dataclasses import dataclass


@dataclass
class _Entry:
    proc: subprocess.Popen[str]
    cancelled: bool = False


_builds: dict[int, _Entry] = {}
_runs: dict[int, _Entry] = {}
_lock = threading.Lock()


def register_build(build_id: int, proc: subprocess.Popen[str]) -> None:
    with _lock:
        _builds[build_id] = _Entry(proc=proc)


def register_run(run_id: int, proc: subprocess.Popen[str]) -> None:
    with _lock:
        _runs[run_id] = _Entry(proc=proc)


def unregister_build(build_id: int) -> None:
    with _lock:
        _builds.pop(build_id, None)


def unregister_run(run_id: int) -> None:
    with _lock:
        _runs.pop(run_id, None)


def _terminate(proc: subprocess.Popen[str], grace: float = 5.0) -> None:
    if proc.poll() is not None:
        return
    try:
        proc.send_signal(signal.SIGTERM)
    except ProcessLookupError:
        return
    deadline = time.time() + grace
    while proc.poll() is None and time.time() < deadline:
        time.sleep(0.1)
    if proc.poll() is None:
        proc.kill()


def cancel_build(build_id: int) -> bool:
    with _lock:
        entry = _builds.get(build_id)
    if entry is None:
        return False
    entry.cancelled = True
    _terminate(entry.proc)
    return True


def cancel_run(run_id: int) -> bool:
    with _lock:
        entry = _runs.get(run_id)
    if entry is None:
        return False
    entry.cancelled = True
    _terminate(entry.proc)
    return True


def was_build_cancelled(build_id: int) -> bool:
    with _lock:
        entry = _builds.get(build_id)
        return entry is not None and entry.cancelled


def was_run_cancelled(run_id: int) -> bool:
    with _lock:
        entry = _runs.get(run_id)
        return entry is not None and entry.cancelled

"""Celery tasks: build_project, run_simulation.

These are intentionally thin wrappers — the real orchestration lives in
``services/builder.py`` and ``services/runner.py``.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

import redis

from .. import db as _db
from ..config import settings
from ..models import Build, BuildStatus, InputFile, ProblemFile, Run, RunStatus
from ..services import builder, runner, workspace
from .celery_app import celery

_redis = redis.Redis.from_url(settings.redis_url)


def _publish(channel: str, stream: str, text: str) -> None:
    _redis.publish(channel, json.dumps({"type": "line", "stream": stream, "text": text}))


def _publish_status(channel: str, status: str) -> None:
    _redis.publish(channel, json.dumps({"type": "status", "status": status}))


@celery.task(name="build_project")
def build_project(build_id: int) -> None:
    with _db.SessionLocal() as db:
        build = db.get(Build, build_id)
        if build is None:
            return
        project = build.project
        problem: ProblemFile | None = project.problem_file
        if problem is None:
            build.status = BuildStatus.failed
            build.error = "Project has no problem file"
            db.commit()
            return

        channel = f"build:{build_id}"
        log_path = workspace.logs_dir(project.slug) / f"build-{build_id}.log"
        build.status = BuildStatus.running
        build.started_at = datetime.now(UTC)
        build.log_path = str(log_path)
        db.commit()
        _publish_status(channel, "running")

        try:
            result = builder.build(
                slug=project.slug,
                problem_cpp=problem.content,
                cmake_flags=build.cmake_flags or {},
                log_path=log_path,
                publish=lambda line: _publish(channel, "stdout", line),
                build_id=build_id,
            )
        except Exception as exc:  # noqa: BLE001
            build.status = BuildStatus.failed
            build.error = str(exc)
            build.finished_at = datetime.now(UTC)
            db.commit()
            _publish_status(channel, "failed")
            raise

        build.finished_at = datetime.now(UTC)
        if result.success and result.binary_path:
            build.status = BuildStatus.success
            build.binary_path = str(result.binary_path)
            _publish_status(channel, "success")
        elif result.cancelled:
            build.status = BuildStatus.cancelled
            build.error = "cancelled by user"
            _publish_status(channel, "cancelled")
        else:
            build.status = BuildStatus.failed
            build.error = f"cmake exited with code {result.returncode}"
            _publish_status(channel, "failed")
        db.commit()


@celery.task(name="run_simulation")
def run_simulation(run_id: int) -> None:
    with _db.SessionLocal() as db:
        run = db.get(Run, run_id)
        if run is None:
            return
        build = run.build
        if build.binary_path is None:
            run.status = RunStatus.failed
            run.error = "Build has no binary"
            db.commit()
            return
        inp: InputFile | None = db.get(InputFile, run.input_file_id)
        if inp is None:
            run.status = RunStatus.failed
            run.error = "Input file missing"
            db.commit()
            return

        project = build.project
        channel = f"run:{run_id}"
        run_dir = workspace.runs_dir(project.slug) / f"{run_id}"
        log_path = workspace.logs_dir(project.slug) / f"run-{run_id}.log"

        run.status = RunStatus.running
        run.started_at = datetime.now(UTC)
        run.output_dir = str(run_dir)
        run.log_path = str(log_path)
        db.commit()
        _publish_status(channel, "running")

        try:
            result = runner.run_simulation(
                binary_path=Path(build.binary_path),
                input_text=inp.content,
                run_dir=run_dir,
                log_path=log_path,
                publish=lambda line: _publish(channel, "stdout", line),
                run_id=run_id,
            )
        except Exception as exc:  # noqa: BLE001
            run.status = RunStatus.failed
            run.error = str(exc)
            run.finished_at = datetime.now(UTC)
            db.commit()
            _publish_status(channel, "failed")
            raise

        run.pid = result.pid
        run.exit_code = result.exit_code
        run.finished_at = datetime.now(UTC)
        if result.cancelled:
            run.status = RunStatus.cancelled
            run.error = "cancelled by user"
        elif result.exit_code == 0:
            run.status = RunStatus.success
        else:
            run.status = RunStatus.failed
        db.commit()
        _publish_status(channel, run.status.value)

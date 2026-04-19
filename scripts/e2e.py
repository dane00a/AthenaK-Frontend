#!/usr/bin/env python3
"""End-to-end driver: create project from Sod template, build, run, assert .hst.

Expects the backend already running at $API_BASE (default http://localhost:8000).
Exits non-zero on any step failure; prints a concise trace. Poll timeouts are
generous because a real AthenaK build can take a few minutes on cold runs.
"""

from __future__ import annotations

import os
import sys
import time
import urllib.error
import urllib.request
from json import dumps, loads

API = os.environ.get("API_BASE", "http://localhost:8000")
BUILD_TIMEOUT = int(os.environ.get("BUILD_TIMEOUT", "900"))  # 15 min
RUN_TIMEOUT = int(os.environ.get("RUN_TIMEOUT", "300"))  # 5 min


def _req(path: str, method: str = "GET", body: dict | None = None) -> dict:
    data = dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(
        f"{API}{path}",
        data=data,
        method=method,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return loads(resp.read().decode("utf-8") or "null")


def poll(path: str, predicate, *, timeout: int, label: str) -> dict:
    deadline = time.time() + timeout
    while time.time() < deadline:
        payload = _req(path)
        if predicate(payload):
            return payload
        time.sleep(2)
    raise SystemExit(f"timeout after {timeout}s waiting for {label} at {path}")


def main() -> int:
    print(f"[e2e] API={API}")
    _req("/api/health")
    print("[e2e] health ok")

    project = _req(
        "/api/templates/sod/projects", "POST", {"template_id": "sod", "name": "e2e-sod"}
    )
    pid = project["id"]
    print(f"[e2e] created project #{pid} slug={project['slug']}")

    build = _req(f"/api/projects/{pid}/builds", "POST", {"cmake_flags": {}})
    bid = build["id"]
    print(f"[e2e] build enqueued #{bid}")

    build = poll(
        f"/api/builds/{bid}",
        lambda p: p["status"] in ("success", "failed", "cancelled"),
        timeout=BUILD_TIMEOUT,
        label="build to finish",
    )
    if build["status"] != "success":
        print(f"[e2e] FAIL: build status={build['status']} error={build.get('error')}")
        return 1
    print("[e2e] build success")

    inputs = _req(f"/api/projects/{pid}/inputs")
    if not inputs:
        print("[e2e] FAIL: template produced no input files")
        return 1
    iid = inputs[0]["id"]

    run = _req(f"/api/builds/{bid}/runs", "POST", {"input_file_id": iid})
    rid = run["id"]
    print(f"[e2e] run enqueued #{rid}")

    run = poll(
        f"/api/runs/{rid}",
        lambda p: p["status"] in ("success", "failed", "cancelled"),
        timeout=RUN_TIMEOUT,
        label="run to finish",
    )
    if run["status"] != "success":
        print(f"[e2e] FAIL: run status={run['status']} exit={run.get('exit_code')}")
        return 1
    print("[e2e] run success")

    outputs = _req(f"/api/runs/{rid}/outputs")
    hst = [o for o in outputs if o["kind"] == "hst"]
    if not hst:
        print(f"[e2e] FAIL: no .hst in outputs, got: {outputs}")
        return 1
    print(f"[e2e] .hst found: {hst[0]['name']} ({hst[0]['size']} B)")
    print("[e2e] OK")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except urllib.error.HTTPError as e:
        print(f"[e2e] HTTP {e.code}: {e.read().decode(errors='replace')}")
        sys.exit(1)

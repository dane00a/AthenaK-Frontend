"""WebSocket log streams for builds and runs. See CLAUDE.md §5.4."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path

import redis.asyncio as aioredis
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..config import settings
from ..db import SessionLocal
from ..models import Build, Run

router = APIRouter()


async def _replay_log(ws: WebSocket, log_path: Path | None) -> None:
    if not log_path or not log_path.exists():
        return
    with log_path.open("r", encoding="utf-8") as fp:
        for line in fp:
            await ws.send_text(
                json.dumps({"type": "line", "stream": "stdout", "text": line.rstrip("\n")})
            )


async def _stream_channel(ws: WebSocket, channel: str) -> None:
    r = aioredis.from_url(settings.redis_url, decode_responses=True)
    pubsub = r.pubsub()
    await pubsub.subscribe(channel)
    try:
        async for msg in pubsub.listen():
            if msg["type"] != "message":
                continue
            await ws.send_text(msg["data"])
            try:
                payload = json.loads(msg["data"])
            except json.JSONDecodeError:
                continue
            if payload.get("type") == "status" and payload.get("status") in {
                "success",
                "failed",
                "cancelled",
            }:
                break
    finally:
        await pubsub.unsubscribe(channel)
        await pubsub.close()
        await r.close()


@router.websocket("/ws/builds/{build_id}")
async def build_logs(ws: WebSocket, build_id: int) -> None:
    await ws.accept()
    with SessionLocal() as db:
        build = db.get(Build, build_id)
        log_path = Path(build.log_path) if build and build.log_path else None
    try:
        await _replay_log(ws, log_path)
        await _stream_channel(ws, f"build:{build_id}")
    except WebSocketDisconnect:
        pass
    except asyncio.CancelledError:
        raise


@router.websocket("/ws/runs/{run_id}")
async def run_logs(ws: WebSocket, run_id: int) -> None:
    await ws.accept()
    with SessionLocal() as db:
        run = db.get(Run, run_id)
        log_path = Path(run.log_path) if run and run.log_path else None
    try:
        await _replay_log(ws, log_path)
        await _stream_channel(ws, f"run:{run_id}")
    except WebSocketDisconnect:
        pass
    except asyncio.CancelledError:
        raise

from __future__ import annotations

import redis
from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, str]:
    """Shallow liveness probe — the process is up."""
    return {"status": "ok"}


@router.get("/ready")
def ready(response: Response, db: Session = Depends(get_db)) -> dict[str, object]:
    """Readiness probe — DB and Redis must both answer."""
    checks: dict[str, str] = {}
    ok = True

    try:
        db.execute(text("SELECT 1"))
        checks["db"] = "ok"
    except Exception as exc:  # noqa: BLE001
        checks["db"] = f"fail: {exc}"
        ok = False

    try:
        redis.Redis.from_url(settings.redis_url, socket_connect_timeout=1).ping()
        checks["redis"] = "ok"
    except Exception as exc:  # noqa: BLE001
        checks["redis"] = f"fail: {exc}"
        ok = False

    if not ok:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return {"status": "ok" if ok else "degraded", "checks": checks}

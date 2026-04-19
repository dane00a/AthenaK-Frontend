from __future__ import annotations

from collections.abc import Awaitable, Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from .auth import _decode_token
from .config import settings
from .db import Base, engine
from .logging import RequestIdMiddleware, configure_logging


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    # Create tables on startup (Alembic is the source of truth in prod; this
    # keeps local dev friction-free).
    Base.metadata.create_all(bind=engine)
    settings.workspaces_dir.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title="AthenaK-Frontend API", version="0.1.0", lifespan=lifespan)

app.add_middleware(RequestIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Paths that must remain reachable without a session cookie even when auth
# is on — health/ready (for load balancers) + the auth router itself.
_AUTH_EXEMPT_PREFIXES = (
    "/api/health",
    "/api/ready",
    "/api/auth/",
)


@app.middleware("http")
async def _auth_gate(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    if not settings.auth_enabled:
        return await call_next(request)
    path = request.url.path
    if not path.startswith("/api/"):
        return await call_next(request)
    if any(path.startswith(p) for p in _AUTH_EXEMPT_PREFIXES):
        return await call_next(request)
    cookie = request.cookies.get(settings.auth_cookie_name)
    if cookie and _decode_token(cookie):
        return await call_next(request)
    return Response(
        content='{"detail":"authentication required"}',
        status_code=401,
        media_type="application/json",
    )


from .api import (  # noqa: E402
    auth as auth_api,
)
from .api import (  # noqa: E402
    builds,
    health,
    inputs,
    outputs,
    problems,
    projects,
    runs,
    ws,
)
from .api import (  # noqa: E402
    storage as storage_api,
)
from .api import (  # noqa: E402
    templates as project_templates_api,
)

app.include_router(health.router, prefix="/api")
app.include_router(auth_api.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(problems.router, prefix="/api")
app.include_router(inputs.router, prefix="/api")
app.include_router(builds.router, prefix="/api")
app.include_router(runs.router, prefix="/api")
app.include_router(outputs.router, prefix="/api")
app.include_router(storage_api.router, prefix="/api")
app.include_router(project_templates_api.router, prefix="/api")
app.include_router(ws.router)

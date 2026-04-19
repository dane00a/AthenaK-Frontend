from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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


from .api import builds, health, inputs, outputs, problems, projects, runs, ws  # noqa: E402

app.include_router(health.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(problems.router, prefix="/api")
app.include_router(inputs.router, prefix="/api")
app.include_router(builds.router, prefix="/api")
app.include_router(runs.router, prefix="/api")
app.include_router(outputs.router, prefix="/api")
app.include_router(ws.router)

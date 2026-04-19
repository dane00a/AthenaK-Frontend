from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Project, Run
from ..services import storage

router = APIRouter(tags=["storage"])


class RunUsageOut(BaseModel):
    run_id: int
    bytes: int


class StorageOut(BaseModel):
    total_bytes: int
    build_bytes: int
    logs_bytes: int
    run_bytes: list[RunUsageOut]


class RetentionIn(BaseModel):
    kind: str  # "never" | "keep_last_n"
    n: int | None = None


@router.get("/projects/{project_id}/storage", response_model=StorageOut)
def get_storage(project_id: int, db: Session = Depends(get_db)) -> StorageOut:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "project not found")
    rep = storage.report(project.slug)
    return StorageOut(
        total_bytes=rep.total_bytes,
        build_bytes=rep.build_bytes,
        logs_bytes=rep.logs_bytes,
        run_bytes=[RunUsageOut(run_id=r.run_id, bytes=r.bytes) for r in rep.run_bytes],
    )


@router.put("/projects/{project_id}/retention")
def set_retention(
    project_id: int, body: RetentionIn, db: Session = Depends(get_db)
) -> dict[str, object]:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "project not found")
    if body.kind not in {"never", "keep_last_n"}:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "unknown retention kind")
    if body.kind == "keep_last_n" and (body.n is None or body.n < 1):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "keep_last_n requires n >= 1")
    policy: dict[str, object] = {"kind": body.kind}
    if body.n is not None:
        policy["n"] = body.n
    project.retention_policy = policy
    db.commit()
    return policy


@router.delete("/runs/{run_id}/purge", status_code=status.HTTP_200_OK)
def purge_run_outputs(run_id: int, db: Session = Depends(get_db)) -> dict[str, object]:
    run = db.get(Run, run_id)
    if run is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "run not found")
    slug = run.build.project.slug
    removed = storage.purge_run(slug, run_id)
    return {"run_id": run_id, "purged": removed}

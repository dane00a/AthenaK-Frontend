from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import InputFile, Project
from ..schemas import InputFileCreate, InputFileOut, InputFileUpdate

router = APIRouter(tags=["inputs"])


@router.get("/projects/{project_id}/inputs", response_model=list[InputFileOut])
def list_inputs(project_id: int, db: Session = Depends(get_db)) -> list[InputFile]:
    if db.get(Project, project_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "project not found")
    return list(
        db.scalars(
            select(InputFile).where(InputFile.project_id == project_id).order_by(InputFile.filename)
        )
    )


@router.post(
    "/projects/{project_id}/inputs",
    response_model=InputFileOut,
    status_code=status.HTTP_201_CREATED,
)
def create_input(
    project_id: int, body: InputFileCreate, db: Session = Depends(get_db)
) -> InputFile:
    if db.get(Project, project_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "project not found")
    inp = InputFile(project_id=project_id, filename=body.filename, content=body.content)
    db.add(inp)
    db.commit()
    db.refresh(inp)
    return inp


@router.get("/inputs/{input_id}", response_model=InputFileOut)
def get_input(input_id: int, db: Session = Depends(get_db)) -> InputFile:
    inp = db.get(InputFile, input_id)
    if inp is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "input file not found")
    return inp


@router.put("/inputs/{input_id}", response_model=InputFileOut)
def update_input(input_id: int, body: InputFileUpdate, db: Session = Depends(get_db)) -> InputFile:
    inp = db.get(InputFile, input_id)
    if inp is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "input file not found")
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(inp, key, value)
    db.commit()
    db.refresh(inp)
    return inp


@router.delete("/inputs/{input_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_input(input_id: int, db: Session = Depends(get_db)) -> None:
    inp = db.get(InputFile, input_id)
    if inp is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "input file not found")
    db.delete(inp)
    db.commit()

from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(200), unique=True, nullable=False, index=True)
    physics_module: Mapped[str] = mapped_column(String(32), default="hydro", nullable=False)
    athenak_ref: Mapped[str] = mapped_column(String(200), default="main", nullable=False)
    retention_policy: Mapped[dict] = mapped_column(
        JSON, default=lambda: {"kind": "never"}, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    problem_file = relationship(
        "ProblemFile", uselist=False, back_populates="project", cascade="all, delete-orphan"
    )
    input_files = relationship("InputFile", back_populates="project", cascade="all, delete-orphan")
    builds = relationship("Build", back_populates="project", cascade="all, delete-orphan")

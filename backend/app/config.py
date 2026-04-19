from __future__ import annotations

import os
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    athenak_cache_dir: Path = Field(default=Path.home() / ".athenak-frontend")
    athenak_git_url: str = "https://github.com/IAS-Astrophysics/athenak.git"
    athenak_default_ref: str = "main"

    database_url: str = "sqlite:///./athenak.db"
    redis_url: str = "redis://localhost:6379/0"

    cors_origins: str = "http://localhost:5173"
    build_jobs: int | None = None
    app_env: str = "dev"  # "dev" -> console logs, anything else -> JSON

    # Auth — off by default. Set AUTH_ENABLED=true + ADMIN_PASSWORD_HASH
    # (bcrypt) to turn on a single-user login gate.
    auth_enabled: bool = False
    admin_password_hash: str = ""
    auth_secret: str = "dev-secret-change-me"
    auth_cookie_name: str = "athenak_session"
    auth_cookie_max_age_s: int = 86_400

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def upstream_dir(self) -> Path:
        return self.athenak_cache_dir.expanduser() / "upstream" / "athenak"

    @property
    def workspaces_dir(self) -> Path:
        return self.athenak_cache_dir.expanduser() / "workspaces"

    @property
    def nproc(self) -> int:
        return self.build_jobs or os.cpu_count() or 2


settings = Settings()

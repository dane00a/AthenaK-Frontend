from __future__ import annotations

from fastapi import APIRouter, HTTPException, Response, status
from pydantic import BaseModel

from ..auth import clear_cookie, issue_cookie, verify_password
from ..config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginIn(BaseModel):
    password: str


class AuthStatus(BaseModel):
    enabled: bool
    authenticated: bool


@router.get("/status", response_model=AuthStatus)
def auth_status(session: str | None = None) -> AuthStatus:
    # The frontend reads this to decide whether to show the login page.
    return AuthStatus(enabled=settings.auth_enabled, authenticated=not settings.auth_enabled)


@router.post("/login", status_code=status.HTTP_204_NO_CONTENT)
def login(body: LoginIn, response: Response) -> Response:
    if not settings.auth_enabled:
        raise HTTPException(status.HTTP_409_CONFLICT, "auth is disabled")
    if not verify_password(body.password, settings.admin_password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "bad password")
    issue_cookie(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> Response:
    clear_cookie(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response

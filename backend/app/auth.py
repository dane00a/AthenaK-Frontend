"""Optional single-user auth gate.

When ``settings.auth_enabled`` is False, ``require_user`` is a no-op.
Flip the flag on and set ``ADMIN_PASSWORD_HASH`` (bcrypt) to require a
password. Login issues an HttpOnly cookie carrying an HMAC-signed
session payload (same semantics as a symmetric JWT, no external dep).
"""
from __future__ import annotations

import base64
import hmac
import json
import time
from hashlib import sha256

import bcrypt
from fastapi import Cookie, HTTPException, status
from fastapi.responses import Response

from .config import settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    if not hashed:
        return False
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def _b64e(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64d(text: str) -> bytes:
    padded = text + "=" * (-len(text) % 4)
    return base64.urlsafe_b64decode(padded.encode("ascii"))


def _sign(payload_b64: str) -> str:
    mac = hmac.new(settings.auth_secret.encode("utf-8"), payload_b64.encode("ascii"), sha256)
    return _b64e(mac.digest())


def _encode_token(sub: str = "admin") -> str:
    now = int(time.time())
    body = {"sub": sub, "iat": now, "exp": now + settings.auth_cookie_max_age_s}
    payload = _b64e(json.dumps(body, separators=(",", ":")).encode("utf-8"))
    return f"{payload}.{_sign(payload)}"


def _decode_token(token: str) -> dict | None:
    try:
        payload, sig = token.split(".", 1)
    except ValueError:
        return None
    if not hmac.compare_digest(_sign(payload), sig):
        return None
    try:
        body = json.loads(_b64d(payload))
    except (ValueError, json.JSONDecodeError):
        return None
    if not isinstance(body, dict):
        return None
    if int(body.get("exp", 0)) < int(time.time()):
        return None
    return body


def issue_cookie(response: Response) -> None:
    response.set_cookie(
        settings.auth_cookie_name,
        _encode_token(),
        max_age=settings.auth_cookie_max_age_s,
        httponly=True,
        samesite="lax",
    )


def clear_cookie(response: Response) -> None:
    response.delete_cookie(settings.auth_cookie_name)


def require_user(
    session: str | None = Cookie(default=None, alias=settings.auth_cookie_name),
) -> dict:
    """FastAPI dependency: 401 unless a valid session cookie is present."""
    if not settings.auth_enabled:
        return {"anonymous": True}
    if not session:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "authentication required")
    payload = _decode_token(session)
    if payload is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid or expired session")
    return payload

from fastapi.testclient import TestClient

from app import config as config_module
from app.auth import hash_password


def test_auth_off_allows_all(client: TestClient) -> None:
    # Default fixture has auth disabled.
    assert client.get("/api/projects").status_code == 200


def test_auth_on_blocks_without_cookie(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(config_module.settings, "auth_enabled", True)
    monkeypatch.setattr(config_module.settings, "admin_password_hash", hash_password("hunter2"))
    r = client.get("/api/projects")
    assert r.status_code == 401


def test_auth_status_reports_state(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(config_module.settings, "auth_enabled", True)
    monkeypatch.setattr(config_module.settings, "admin_password_hash", hash_password("hi"))
    s = client.get("/api/auth/status").json()
    assert s["enabled"] is True and s["authenticated"] is False


def test_login_sets_cookie_and_unblocks(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(config_module.settings, "auth_enabled", True)
    monkeypatch.setattr(config_module.settings, "admin_password_hash", hash_password("pw"))

    bad = client.post("/api/auth/login", json={"password": "wrong"})
    assert bad.status_code == 401

    good = client.post("/api/auth/login", json={"password": "pw"})
    assert good.status_code == 204
    assert any(
        c.name == config_module.settings.auth_cookie_name for c in client.cookies.jar
    )
    assert client.get("/api/projects").status_code == 200


def test_logout_clears_cookie(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(config_module.settings, "auth_enabled", True)
    monkeypatch.setattr(config_module.settings, "admin_password_hash", hash_password("pw"))
    client.post("/api/auth/login", json={"password": "pw"})
    assert client.get("/api/projects").status_code == 200
    client.post("/api/auth/logout")
    # TestClient keeps the cookie unless server sends an explicit delete — the
    # Set-Cookie with Max-Age=0 does that. Verify we're now 401.
    r = client.get("/api/projects")
    assert r.status_code == 401

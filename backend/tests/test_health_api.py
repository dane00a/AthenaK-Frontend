from fastapi.testclient import TestClient


def test_health(client: TestClient) -> None:
    r = client.get("/api/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"


def test_ready_db_ok(client: TestClient) -> None:
    r = client.get("/api/ready")
    # Redis usually isn't up in the test env; accept either 200 or 503, but
    # the DB check must always pass.
    body = r.json()
    assert body["checks"]["db"] == "ok"
    assert body["status"] in {"ok", "degraded"}


def test_request_id_echoed(client: TestClient) -> None:
    r = client.get("/api/health", headers={"x-request-id": "abc-123"})
    assert r.headers["x-request-id"] == "abc-123"


def test_request_id_generated(client: TestClient) -> None:
    r = client.get("/api/health")
    assert len(r.headers["x-request-id"]) >= 16

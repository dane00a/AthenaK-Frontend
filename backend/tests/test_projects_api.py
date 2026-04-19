from fastapi.testclient import TestClient


def test_create_and_list(client: TestClient) -> None:
    r = client.post("/api/projects", json={"name": "Sod Shock Tube"})
    assert r.status_code == 201, r.text
    created = r.json()
    assert created["slug"] == "sod-shock-tube"
    assert created["physics_module"] == "hydro"

    r = client.get("/api/projects")
    assert r.status_code == 200
    assert any(p["id"] == created["id"] for p in r.json())


def test_slug_uniqueness(client: TestClient) -> None:
    a = client.post("/api/projects", json={"name": "Blast"}).json()
    b = client.post("/api/projects", json={"name": "Blast"}).json()
    assert a["slug"] == "blast"
    assert b["slug"] == "blast-2"


def test_get_update_delete(client: TestClient) -> None:
    pid = client.post("/api/projects", json={"name": "P"}).json()["id"]
    assert client.get(f"/api/projects/{pid}").status_code == 200

    r = client.patch(f"/api/projects/{pid}", json={"physics_module": "mhd"})
    assert r.status_code == 200 and r.json()["physics_module"] == "mhd"

    assert client.delete(f"/api/projects/{pid}").status_code == 204
    assert client.get(f"/api/projects/{pid}").status_code == 404


def test_missing_project_404(client: TestClient) -> None:
    assert client.get("/api/projects/9999").status_code == 404

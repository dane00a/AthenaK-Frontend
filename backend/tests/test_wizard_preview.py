from fastapi.testclient import TestClient


def test_preview_does_not_save(client: TestClient) -> None:
    pid = client.post("/api/projects", json={"name": "p"}).json()["id"]
    client.put(f"/api/projects/{pid}/problem", json={"content": "// original"})
    r = client.post(
        f"/api/projects/{pid}/problem/from-wizard/preview",
        json={"physics_module": "hydro", "initial_condition": "shock_tube"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["base_content"] == "// original"
    assert "ProblemGenerator::UserProblem" in body["content"]
    # DB unchanged
    assert client.get(f"/api/projects/{pid}/problem").json()["content"] == "// original"


def test_preview_missing_project(client: TestClient) -> None:
    r = client.post(
        "/api/projects/9999/problem/from-wizard/preview",
        json={},
    )
    assert r.status_code == 404

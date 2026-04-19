from fastapi.testclient import TestClient


def _mkproject(client: TestClient) -> int:
    return client.post("/api/projects", json={"name": "p"}).json()["id"]


def test_input_crud(client: TestClient) -> None:
    pid = _mkproject(client)
    r = client.post(
        f"/api/projects/{pid}/inputs",
        json={"filename": "sod.athinput", "content": "<time>\ntlim = 0.25\n"},
    )
    assert r.status_code == 201
    iid = r.json()["id"]

    r = client.get(f"/api/projects/{pid}/inputs")
    assert r.status_code == 200 and len(r.json()) == 1

    r = client.put(f"/api/inputs/{iid}", json={"content": "<time>\ntlim = 0.5\n"})
    assert r.status_code == 200 and "0.5" in r.json()["content"]

    assert client.delete(f"/api/inputs/{iid}").status_code == 204
    assert client.get(f"/api/inputs/{iid}").status_code == 404


def test_input_on_missing_project(client: TestClient) -> None:
    r = client.post("/api/projects/9999/inputs", json={"filename": "x", "content": ""})
    assert r.status_code == 404

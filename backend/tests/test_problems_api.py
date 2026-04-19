from fastapi.testclient import TestClient


def _create_project(client: TestClient) -> int:
    return client.post("/api/projects", json={"name": "demo"}).json()["id"]


def test_problem_autocreated_empty(client: TestClient) -> None:
    pid = _create_project(client)
    r = client.get(f"/api/projects/{pid}/problem")
    assert r.status_code == 200
    assert r.json()["content"] == ""
    assert r.json()["filename"] == "user_problem.cpp"


def test_put_problem(client: TestClient) -> None:
    pid = _create_project(client)
    r = client.put(f"/api/projects/{pid}/problem", json={"content": "// hi"})
    assert r.status_code == 200 and r.json()["content"] == "// hi"


def test_generate_from_wizard(client: TestClient) -> None:
    pid = _create_project(client)
    r = client.post(
        f"/api/projects/{pid}/problem/from-wizard",
        json={"physics_module": "hydro", "initial_condition": "shock_tube"},
    )
    assert r.status_code == 200
    src = r.json()["content"]
    assert "ProblemGenerator::UserProblem" in src
    assert "// >>> user:init_body" in src


def test_wizard_preserves_user_regions(client: TestClient) -> None:
    pid = _create_project(client)
    first = client.post(
        f"/api/projects/{pid}/problem/from-wizard",
        json={"physics_module": "hydro", "initial_condition": "uniform"},
    ).json()["content"]
    edited = first.replace(
        "// >>> user:pre_init\n",
        "// >>> user:pre_init\n  Real my_param = 1.0;\n",
        1,
    )
    client.put(f"/api/projects/{pid}/problem", json={"content": edited})
    second = client.post(
        f"/api/projects/{pid}/problem/from-wizard",
        json={"physics_module": "hydro", "initial_condition": "blast"},
    ).json()["content"]
    assert "my_param = 1.0" in second

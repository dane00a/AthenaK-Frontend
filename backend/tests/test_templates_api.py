from fastapi.testclient import TestClient


def test_list_templates_includes_sod(client: TestClient) -> None:
    r = client.get("/api/templates")
    assert r.status_code == 200
    ids = [t["id"] for t in r.json()]
    assert "sod" in ids
    assert "blast" in ids
    assert "kh2d" in ids


def test_create_project_from_sod(client: TestClient) -> None:
    r = client.post("/api/templates/sod/projects", json={"template_id": "sod"})
    assert r.status_code == 201
    proj = r.json()
    assert proj["name"] == "Sod shock tube"
    assert proj["physics_module"] == "hydro"

    # The project has a problem file and one input file.
    pf = client.get(f"/api/projects/{proj['id']}/problem").json()
    assert "ProblemGenerator::UserProblem" in pf["content"]
    ifiles = client.get(f"/api/projects/{proj['id']}/inputs").json()
    assert len(ifiles) == 1 and ifiles[0]["filename"] == "sod.athinput"
    assert "Sod shock tube" in ifiles[0]["content"]


def test_unknown_template_404(client: TestClient) -> None:
    r = client.post(
        "/api/templates/does-not-exist/projects",
        json={"template_id": "does-not-exist"},
    )
    assert r.status_code == 404


def test_custom_name_overrides_default(client: TestClient) -> None:
    r = client.post(
        "/api/templates/blast/projects", json={"template_id": "blast", "name": "My Blast"}
    )
    assert r.status_code == 201
    assert r.json()["name"] == "My Blast"
    assert r.json()["slug"] == "my-blast"

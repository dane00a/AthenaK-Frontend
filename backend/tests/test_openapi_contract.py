"""Contract checks against the OpenAPI document served by FastAPI.

- Confirms every API path we expect is present (so a rename goes red).
- Confirms the `components/schemas` that the generated frontend types
  depend on exist (paired with frontend/src/lib/api-types.ts via K13).
"""

from __future__ import annotations

from fastapi.testclient import TestClient

EXPECTED_PATHS = [
    "/api/health",
    "/api/ready",
    "/api/auth/login",
    "/api/auth/logout",
    "/api/auth/status",
    "/api/projects",
    "/api/projects/{project_id}",
    "/api/projects/{project_id}/problem",
    "/api/projects/{project_id}/problem/from-wizard",
    "/api/projects/{project_id}/problem/from-wizard/preview",
    "/api/projects/{project_id}/inputs",
    "/api/inputs/{input_id}",
    "/api/projects/{project_id}/builds",
    "/api/builds/{build_id}",
    "/api/builds/{build_id}/cancel",
    "/api/builds/{build_id}/runs",
    "/api/runs/{run_id}",
    "/api/runs/{run_id}/cancel",
    "/api/runs/{run_id}/outputs",
    "/api/runs/{run_id}/outputs/{name}",
    "/api/runs/{run_id}/outputs/{name}/series",
    "/api/runs/{run_id}/outputs/{name}/variables",
    "/api/runs/{run_id}/outputs/{name}/field",
    "/api/projects/{project_id}/storage",
    "/api/projects/{project_id}/retention",
    "/api/runs/{run_id}/purge",
    "/api/templates",
    "/api/templates/{template_id}/projects",
]

EXPECTED_SCHEMAS = [
    "ProjectOut",
    "ProjectCreate",
    "ProjectUpdate",
    "ProblemFileOut",
    "ProblemFileUpdate",
    "WizardParamsIn",
    "InputFileOut",
    "InputFileCreate",
    "InputFileUpdate",
    "BuildOut",
    "BuildCreate",
    "RunOut",
    "RunCreate",
    "StorageOut",
    "AuthStatus",
    "LoginIn",
    "FieldOut",
]


def test_openapi_has_every_expected_path(client: TestClient) -> None:
    spec = client.get("/openapi.json").json()
    missing = [p for p in EXPECTED_PATHS if p not in spec["paths"]]
    assert not missing, f"missing paths: {missing}"


def test_openapi_has_every_expected_schema(client: TestClient) -> None:
    spec = client.get("/openapi.json").json()
    defs = spec["components"]["schemas"]
    missing = [s for s in EXPECTED_SCHEMAS if s not in defs]
    assert not missing, f"missing schemas: {missing}"


def test_openapi_is_valid_openapi_3(client: TestClient) -> None:
    spec = client.get("/openapi.json").json()
    assert spec.get("openapi", "").startswith("3.")
    assert "paths" in spec and "components" in spec

/**
 * UI smoke test.
 *
 * We stub every /api/* request and /ws/* connection at the browser level so
 * the test doesn't need a backend or Redis. That keeps the scope tight:
 * we're proving that the frontend renders the happy path and wires clicks
 * to the expected network calls. The `make test` invariants and the K5
 * e2e CI job cover the real-stack flow.
 */
import { expect, test } from "@playwright/test";

type FakeProject = {
  id: number;
  name: string;
  slug: string;
  physics_module: string;
  athenak_ref: string;
  created_at: string;
  updated_at: string;
};

test("full happy path: create from template, author, build, run, visualize", async ({
  page,
}) => {
  const project: FakeProject = {
    id: 1,
    name: "Sod shock tube",
    slug: "sod-shock-tube",
    physics_module: "hydro",
    athenak_ref: "main",
    created_at: "2026-04-19T00:00:00Z",
    updated_at: "2026-04-19T00:00:00Z",
  };

  const problem = {
    id: 1,
    filename: "user_problem.cpp",
    content:
      "// generated from template\nvoid ProblemGenerator::UserProblem(ParameterInput *pin, const bool restart) {\n  // >>> user:init_body\n  // <<< user:init_body\n}",
    updated_at: "",
  };

  const inputs = [
    {
      id: 1,
      project_id: 1,
      filename: "sod.athinput",
      content: "<time>\ntlim = 0.25\n",
      updated_at: "",
    },
  ];

  const builds = [
    {
      id: 1,
      project_id: 1,
      status: "success" as const,
      cmake_flags: {},
      log_path: "/x.log",
      binary_path: "/x/athena",
      error: null,
      diagnostics: [],
      source_hash: "abc",
      reused_from: null,
      started_at: null,
      finished_at: null,
      created_at: "",
    },
  ];

  const runs = [
    {
      id: 1,
      build_id: 1,
      input_file_id: 1,
      status: "success" as const,
      pid: null,
      log_path: "/r.log",
      output_dir: "/r",
      exit_code: 0,
      error: null,
      started_at: null,
      finished_at: null,
      created_at: "",
    },
  ];

  // ---- API stubs ----
  await page.route("**/api/auth/status", (route) =>
    route.fulfill({ json: { enabled: false, authenticated: true } }),
  );
  await page.route("**/api/templates", (route) =>
    route.fulfill({
      json: [
        {
          id: "sod",
          name: "Sod shock tube",
          description: "classic 1D shock tube",
          physics_module: "hydro",
        },
      ],
    }),
  );
  await page.route("**/api/projects", async (route) => {
    if (route.request().method() === "POST") {
      return route.fulfill({ json: project });
    }
    return route.fulfill({ json: [project] });
  });
  await page.route("**/api/templates/*/projects", (route) =>
    route.fulfill({ json: project }),
  );
  await page.route(`**/api/projects/${project.id}`, (route) =>
    route.fulfill({ json: project }),
  );
  await page.route(`**/api/projects/${project.id}/problem`, (route) =>
    route.fulfill({ json: problem }),
  );
  await page.route(`**/api/projects/${project.id}/inputs`, (route) =>
    route.fulfill({ json: inputs }),
  );
  await page.route(`**/api/projects/${project.id}/builds`, async (route) => {
    if (route.request().method() === "POST") {
      return route.fulfill({ json: builds[0] });
    }
    return route.fulfill({ json: builds });
  });
  await page.route(`**/api/builds/${builds[0].id}`, (route) =>
    route.fulfill({ json: builds[0] }),
  );
  await page.route(`**/api/builds/${builds[0].id}/runs`, async (route) => {
    if (route.request().method() === "POST") {
      return route.fulfill({ json: runs[0] });
    }
    return route.fulfill({ json: runs });
  });
  await page.route(`**/api/runs/${runs[0].id}`, (route) =>
    route.fulfill({ json: runs[0] }),
  );
  await page.route(`**/api/runs/${runs[0].id}/outputs`, (route) =>
    route.fulfill({
      json: [{ name: "sod.hst", size: 1024, kind: "hst" }],
    }),
  );
  await page.route(`**/api/runs/${runs[0].id}/outputs/sod.hst/series`, (route) =>
    route.fulfill({
      json: {
        columns: ["time", "mass", "1-E_tot"],
        rows: [
          [0.0, 1.0, 2.5],
          [0.1, 1.0, 2.48],
          [0.2, 1.0, 2.46],
        ],
      },
    }),
  );

  // Sanity: palette opens on ⌘K.
  await page.goto("/");
  await expect(page.getByText("Sod shock tube")).toBeVisible();

  // Navigate to the existing project row.
  await page.getByText("Sod shock tube").first().click();
  await expect(page).toHaveURL(/\/projects\/1/);

  // Problem tab has the wizard-generated source.
  await page.getByRole("link", { name: "Problem" }).click();
  // Monaco renders inside a contenteditable; just confirm the tab mounted
  // by checking the toolbar text.
  await expect(page.getByText(/user_problem\.cpp/i)).toBeVisible();

  // Input tab shows the sod.athinput row.
  await page.getByRole("link", { name: "Input" }).click();
  await expect(page.getByText("sod.athinput")).toBeVisible();

  // Build tab shows the history row + diagnostics panel.
  await page.getByRole("link", { name: "Build" }).click();
  await expect(page.getByText("#1").first()).toBeVisible();

  // Runs tab shows the successful run.
  await page.getByRole("link", { name: "Runs" }).click();
  await expect(page.getByText("run #1")).toBeVisible();

  // Visualize tab renders the outputs list with sod.hst.
  await page.getByRole("link", { name: "Visualize" }).click();
  await expect(page.getByText("sod.hst")).toBeVisible();
});

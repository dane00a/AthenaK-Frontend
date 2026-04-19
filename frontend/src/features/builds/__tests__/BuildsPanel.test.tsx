import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api, type Build, type Project } from "../../../lib/api";
import { BuildsPanel } from "../BuildsPanel";

// xterm needs real layout; stub LogPane so the panel renders without it.
vi.mock("../../../components/LogPane", () => ({
  LogPane: () => <div data-testid="log-pane-stub" />,
}));

const fakeProject: Project = {
  id: 1,
  name: "demo",
  slug: "demo",
  physics_module: "hydro",
  athenak_ref: "main",
  created_at: "",
  updated_at: "",
};

function ShellStub() {
  return <Outlet context={{ project: fakeProject }} />;
}

function renderWithRoutes() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/projects/1/build"]}>
        <Routes>
          <Route path="/projects/:projectId" element={<ShellStub />}>
            <Route path="build" element={<BuildsPanel />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function mkBuild(partial: Partial<Build>): Build {
  return {
    id: 1,
    status: "success",
    binary_path: null,
    error: null,
    diagnostics: [],
    source_hash: null,
    reused_from: null,
    ...partial,
  } as unknown as Build;
}

describe("BuildsPanel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the Build button and MPI/CUDA/Debug toggles", async () => {
    vi.spyOn(api, "listBuilds").mockResolvedValue([]);
    renderWithRoutes();
    await waitFor(() => expect(screen.getByRole("button", { name: "Build" })).toBeInTheDocument());
    expect(screen.getByLabelText(/MPI/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/CUDA/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Debug/i)).toBeInTheDocument();
  });

  it("shows history rows for each build", async () => {
    vi.spyOn(api, "listBuilds").mockResolvedValue([
      mkBuild({ id: 3, status: "success", binary_path: "/x/athena" }),
      mkBuild({ id: 4, status: "failed", error: "boom" }),
    ]);
    renderWithRoutes();
    await waitFor(() => expect(screen.getByText("#3")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("#4")).toBeInTheDocument());
  });

  it("surfaces a 'reused from' chip when the active build was a cache hit", async () => {
    vi.spyOn(api, "listBuilds").mockResolvedValue([
      mkBuild({ id: 9, status: "success", binary_path: "/x/athena", reused_from: 2 }),
    ]);
    renderWithRoutes();
    await waitFor(() => expect(screen.getByText(/reused from #2/i)).toBeInTheDocument());
  });

  it("renders the diagnostics list when the active build has them", async () => {
    vi.spyOn(api, "listBuilds").mockResolvedValue([
      mkBuild({
        id: 1,
        status: "failed",
        diagnostics: [
          {
            file: "user_problem.cpp",
            line: 42,
            column: 5,
            severity: "error",
            message: "oops",
          },
        ] as unknown as Build["diagnostics"],
      }),
    ]);
    renderWithRoutes();
    await waitFor(() => expect(screen.getByText("oops")).toBeInTheDocument());
    expect(screen.getByText(/user_problem.cpp:42:5/i)).toBeInTheDocument();
  });
});

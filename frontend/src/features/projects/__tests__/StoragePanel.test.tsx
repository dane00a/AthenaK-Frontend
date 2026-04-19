import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api, type Project } from "../../../lib/api";
import { StoragePanel } from "../StoragePanel";

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

function renderPanel() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/projects/1/storage"]}>
        <Routes>
          <Route path="/projects/:projectId" element={<ShellStub />}>
            <Route path="storage" element={<StoragePanel />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("StoragePanel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders per-run breakdown with a Purge button each", async () => {
    vi.spyOn(api, "getStorage").mockResolvedValue({
      total_bytes: 9_500_000,
      build_bytes: 1_000_000,
      logs_bytes: 500,
      run_bytes: [
        { run_id: 1, bytes: 300 },
        { run_id: 2, bytes: 8_500_000 },
      ],
    });
    renderPanel();
    await waitFor(() => expect(screen.getByText(/run #1/)).toBeInTheDocument());
    expect(screen.getByText(/run #2/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Purge" }).length).toBe(2);
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("Build")).toBeInTheDocument();
    expect(screen.getByText("Logs")).toBeInTheDocument();
  });

  it("shows 'no runs' empty state", async () => {
    vi.spyOn(api, "getStorage").mockResolvedValue({
      total_bytes: 0,
      build_bytes: 0,
      logs_bytes: 0,
      run_bytes: [],
    });
    renderPanel();
    await waitFor(() => expect(screen.getByText(/no runs have outputs yet/i)).toBeInTheDocument());
  });
});

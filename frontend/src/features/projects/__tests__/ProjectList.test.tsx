import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, type Project } from "../../../lib/api";
import { ProjectList } from "../ProjectList";

function renderList() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ProjectList />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ProjectList", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows an empty state", async () => {
    vi.spyOn(api, "listProjects").mockResolvedValue([]);
    renderList();
    expect(await screen.findByText(/no projects yet/i)).toBeInTheDocument();
  });

  it("renders projects when the query resolves", async () => {
    const fake: Project[] = [
      {
        id: 1,
        name: "Sod Shock Tube",
        slug: "sod-shock-tube",
        physics_module: "hydro",
        athenak_ref: "main",
        created_at: "",
        updated_at: "",
      },
    ];
    vi.spyOn(api, "listProjects").mockResolvedValue(fake);
    renderList();
    await waitFor(() => {
      expect(screen.getByText("Sod Shock Tube")).toBeInTheDocument();
    });
    expect(screen.getByText(/sod-shock-tube · main/)).toBeInTheDocument();
  });

  it("surfaces API errors", async () => {
    vi.spyOn(api, "listProjects").mockRejectedValue(new Error("boom"));
    renderList();
    expect(await screen.findByText(/failed to load/i)).toBeInTheDocument();
  });
});

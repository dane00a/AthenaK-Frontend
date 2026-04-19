import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../api";

describe("api client", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, _init?: RequestInit) => {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends Content-Type on POST", async () => {
    await api.createProject({ name: "x", physics_module: "hydro" });
    const mock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const [, init] = mock.mock.calls[0];
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("throws on non-2xx with status + body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 500, statusText: "Server Error" })),
    );
    await expect(api.listProjects()).rejects.toThrow(/500.*nope/);
  });

  it("URL-encodes output names in getSeries", async () => {
    await api.getSeries(7, "a b.hst");
    const mock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const [url] = mock.mock.calls[0];
    expect(url).toContain("/api/runs/7/outputs/a%20b.hst/series");
  });
});

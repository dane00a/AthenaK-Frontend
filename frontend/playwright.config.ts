import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the UI smoke test.
 *
 * The workflow runs the REAL backend (fake build/run enabled via a
 * pytest-style monkeypatch isn't available in a live server, so the
 * e2e workflow uses the existing stubbed K5 test flow) OR, for local
 * development, a mock built into the test fixtures.
 *
 * See .github/workflows/frontend-e2e.yml for the CI wiring.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    trace: "on-first-retry",
    video: "retain-on-failure",
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "pnpm dev --host 127.0.0.1",
        url: "http://127.0.0.1:5173",
        reuseExistingServer: true,
        timeout: 60_000,
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

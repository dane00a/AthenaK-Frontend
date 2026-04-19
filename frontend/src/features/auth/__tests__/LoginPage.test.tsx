import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "../../../lib/api";
import { LoginPage } from "../LoginPage";

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("LoginPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("submit is disabled without a password", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeDisabled();
  });

  it("posts the password then clears error state on success", async () => {
    const spy = vi.spyOn(api, "authLogin").mockResolvedValue(undefined);
    renderPage();
    const input = screen.getByLabelText(/password/i);
    fireEvent.change(input, { target: { value: "hunter2" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => expect(spy).toHaveBeenCalledWith("hunter2"));
  });

  it("surfaces the error when login fails", async () => {
    vi.spyOn(api, "authLogin").mockRejectedValue(new Error("login failed: 401"));
    renderPage();
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => expect(screen.getByText(/login failed: 401/)).toBeInTheDocument());
  });
});

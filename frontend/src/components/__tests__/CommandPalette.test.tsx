import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { CommandPalette } from "../CommandPalette";

function renderPalette(initial = "/") {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <CommandPalette />
    </MemoryRouter>,
  );
}

describe("CommandPalette", () => {
  it("is hidden by default and opens on ⌘K", () => {
    renderPalette();
    expect(screen.queryByPlaceholderText(/type a command/i)).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(screen.getByPlaceholderText(/type a command/i)).toBeInTheDocument();
  });

  it("opens with Ctrl+K too", () => {
    renderPalette();
    fireEvent.keyDown(window, { key: "K", ctrlKey: true });
    expect(screen.getByPlaceholderText(/type a command/i)).toBeInTheDocument();
  });

  it("shows project tabs when a project is in the URL", () => {
    renderPalette("/projects/42/problem");
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(screen.getByText("Problem")).toBeInTheDocument();
    expect(screen.getByText("Visualize")).toBeInTheDocument();
    expect(screen.getByText("Storage")).toBeInTheDocument();
  });

  it("hides project tabs on the home page", () => {
    renderPalette("/");
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(screen.queryByText("Visualize")).not.toBeInTheDocument();
    expect(screen.getByText(/projects \(home\)/i)).toBeInTheDocument();
  });
});

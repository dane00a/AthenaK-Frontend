import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import type { Diagnostic } from "../../lib/api";
import { DiagnosticsPanel } from "../../features/builds/DiagnosticsPanel";

const sample: Diagnostic[] = [
  {
    file: "/home/u/upstream/athenak/src/pgen/user_problem.cpp",
    line: 42,
    column: 5,
    severity: "error",
    message: "'foo' was not declared in this scope",
  },
  { file: "user_problem.cpp", line: 7, column: 14, severity: "warning", message: "unused" },
];

function wrap(ui: React.ReactNode) {
  return <MemoryRouter>{ui}</MemoryRouter>;
}

describe("DiagnosticsPanel", () => {
  it("renders an empty state when there are no diagnostics", () => {
    render(wrap(<DiagnosticsPanel diagnostics={[]} projectId={1} />));
    expect(screen.getByText(/no diagnostics/i)).toBeInTheDocument();
  });

  it("counts errors and warnings in the header", () => {
    render(wrap(<DiagnosticsPanel diagnostics={sample} projectId={1} />));
    expect(screen.getByText(/1 err · 1 warn/i)).toBeInTheDocument();
  });

  it("renders a basename + line:col for each diagnostic", () => {
    render(wrap(<DiagnosticsPanel diagnostics={sample} projectId={1} />));
    const rows = screen.getAllByText(/user_problem\.cpp:/);
    expect(rows.length).toBe(2);
    expect(screen.getByText(/'foo' was not declared/)).toBeInTheDocument();
    expect(screen.getByText(/unused/)).toBeInTheDocument();
  });

  it("links to the Problem tab with ?line=&col=", () => {
    render(wrap(<DiagnosticsPanel diagnostics={sample} projectId={7} />));
    const link = screen.getByRole("link", { name: /'foo' was not declared/i });
    expect(link.getAttribute("href")).toBe("/projects/7/problem?line=42&col=5");
  });
});

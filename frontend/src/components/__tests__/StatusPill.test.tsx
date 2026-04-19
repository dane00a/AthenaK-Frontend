import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusPill } from "../StatusPill";

describe("StatusPill", () => {
  it("renders the status label in uppercase", () => {
    render(<StatusPill status="running" />);
    const el = screen.getByText("running");
    expect(el).toBeInTheDocument();
    expect(el.className).toMatch(/uppercase/);
  });

  it.each(["queued", "running", "success", "failed", "cancelled"] as const)(
    "has a styled chip for %s",
    (status) => {
      render(<StatusPill status={status} />);
      const el = screen.getByText(status);
      // Each known status gets a distinct color class — just assert it got
      // one of the known color tokens.
      expect(el.className).toMatch(/bg-(slate|amber|emerald|red|muted)/);
    },
  );

  it("falls back to muted styling for unknown statuses", () => {
    render(<StatusPill status="weird" />);
    const el = screen.getByText("weird");
    expect(el.className).toMatch(/bg-muted/);
  });
});

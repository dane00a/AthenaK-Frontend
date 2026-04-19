import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AthInputDoc } from "../../../lib/athinput";
import { InputForm } from "../InputForm";

describe("InputForm", () => {
  it("renders each canonical block", () => {
    render(<InputForm doc={{}} onChange={() => {}} />);
    expect(screen.getByText("<mesh>")).toBeInTheDocument();
    expect(screen.getByText("<time>")).toBeInTheDocument();
    expect(screen.getByText("<hydro>")).toBeInTheDocument();
  });

  it("calls onChange when editing a numeric field", () => {
    const onChange = vi.fn<[AthInputDoc], void>();
    render(<InputForm doc={{}} onChange={onChange} />);
    const nx1 = screen.getByRole("textbox", { name: /nx1/i });
    fireEvent.change(nx1, { target: { value: "256" } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ mesh: { nx1: "256" } }));
  });

  it("deletes a key when its input is cleared", () => {
    const onChange = vi.fn();
    render(<InputForm doc={{ mesh: { nx1: "128" } }} onChange={onChange} />);
    const nx1 = screen.getByDisplayValue("128");
    fireEvent.change(nx1, { target: { value: "" } });
    const patch = onChange.mock.calls[0][0] as AthInputDoc;
    expect(patch.mesh).not.toHaveProperty("nx1");
  });

  it("reflects existing values from the doc", () => {
    render(<InputForm doc={{ time: { tlim: "0.25" } }} onChange={() => {}} />);
    expect(screen.getByDisplayValue("0.25")).toBeInTheDocument();
  });

  it("marks required fields", () => {
    render(<InputForm doc={{}} onChange={() => {}} />);
    // nx1 is required on the mesh block.
    const requiredBadges = screen.getAllByText("required");
    expect(requiredBadges.length).toBeGreaterThan(0);
  });
});

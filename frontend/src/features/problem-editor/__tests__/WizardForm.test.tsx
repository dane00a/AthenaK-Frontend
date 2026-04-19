import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_WIZARD } from "../../../schemas/pgen-wizard";
import { WizardForm } from "../WizardForm";

describe("WizardForm", () => {
  it("emits changes when the physics module is changed", () => {
    const onChange = vi.fn();
    render(
      <WizardForm
        value={DEFAULT_WIZARD}
        onChange={onChange}
        onGenerate={() => {}}
        generating={false}
      />,
    );
    fireEvent.change(screen.getByDisplayValue("hydro"), { target: { value: "mhd" } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ physics_module: "mhd" }));
  });

  it("toggles hook flags", () => {
    const onChange = vi.fn();
    render(
      <WizardForm
        value={DEFAULT_WIZARD}
        onChange={onChange}
        onGenerate={() => {}}
        generating={false}
      />,
    );
    fireEvent.click(screen.getByLabelText("User source terms"));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ register_user_srcs: true }));
  });

  it("calls onGenerate on submit", () => {
    const onGenerate = vi.fn();
    render(
      <WizardForm
        value={DEFAULT_WIZARD}
        onChange={() => {}}
        onGenerate={onGenerate}
        generating={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    expect(onGenerate).toHaveBeenCalledOnce();
  });

  it("disables the Generate button while generating", () => {
    render(
      <WizardForm
        value={DEFAULT_WIZARD}
        onChange={() => {}}
        onGenerate={() => {}}
        generating
      />,
    );
    expect(screen.getByRole("button", { name: "Generating…" })).toBeDisabled();
  });

  it("Reset restores defaults", () => {
    const onChange = vi.fn();
    render(
      <WizardForm
        value={{ ...DEFAULT_WIZARD, physics_module: "mhd", register_user_bcs: true }}
        onChange={onChange}
        onGenerate={() => {}}
        generating={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(onChange).toHaveBeenCalledWith(DEFAULT_WIZARD);
  });
});

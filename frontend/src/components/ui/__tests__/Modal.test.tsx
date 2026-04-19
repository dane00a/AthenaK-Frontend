import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Modal } from "../Modal";

describe("Modal", () => {
  it("renders title and body when open", () => {
    render(
      <Modal open onClose={() => {}} title="Hi">
        <p>body</p>
      </Modal>,
    );
    expect(screen.getByText("Hi")).toBeInTheDocument();
    expect(screen.getByText("body")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(
      <Modal open={false} onClose={() => {}} title="Hi">
        <p>body</p>
      </Modal>,
    );
    expect(screen.queryByText("Hi")).not.toBeInTheDocument();
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="X">
        <p>body</p>
      </Modal>,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes on overlay click but not on inner click", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="X">
        <p data-testid="inner">body</p>
      </Modal>,
    );
    // Clicking the inner body should not close.
    fireEvent.click(screen.getByTestId("inner"));
    expect(onClose).not.toHaveBeenCalled();
    // Clicking the overlay (the outer dialog) should.
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

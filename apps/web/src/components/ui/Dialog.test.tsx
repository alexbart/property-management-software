// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Dialog } from "./Dialog";

afterEach(cleanup);

describe("Dialog", () => {
  it("renders the dialog with its title when open", () => {
    render(
      <Dialog open onClose={() => {}} title="Confirm">
        <p>Body</p>
      </Dialog>,
    );

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Confirm")).toBeTruthy();
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="Confirm">
        <p>Body</p>
      </Dialog>,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when closed", () => {
    render(
      <Dialog open={false} onClose={() => {}} title="Confirm">
        <p>Body</p>
      </Dialog>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
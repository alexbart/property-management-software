// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MoneyDisplay } from "./MoneyDisplay";

afterEach(cleanup);

describe("MoneyDisplay", () => {
  it("formats a KES amount", () => {
    render(<MoneyDisplay value="15000" />);
    expect(screen.getByText(/15,000\.00/)).toBeTruthy();
  });

  it("shows a placeholder for empty values", () => {
    render(<MoneyDisplay value={null} />);
    expect(screen.getByText("—")).toBeTruthy();
  });
});
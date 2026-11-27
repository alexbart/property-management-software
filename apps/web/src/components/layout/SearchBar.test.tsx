// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SearchBar } from "./SearchBar";

vi.mock("../../hooks/useSearch", () => ({
  useSearch: () => ({
    data: {
      properties: [
        {
          id: "p1",
          type: "property",
          label: "Alpha",
          sublabel: "A-1 · Nairobi",
          url: "/properties/p1",
        },
      ],
      landlords: [],
      tenants: [],
    },
    isFetching: false,
  }),
}));

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("SearchBar", () => {
  it("shows grouped results and navigates on click", async () => {
    vi.useFakeTimers();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <SearchBar />
        <LocationDisplay />
      </MemoryRouter>,
    );

    const input = screen.getByLabelText("Global search");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "alpha" } });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    const result = screen.getByText("Alpha");
    fireEvent.click(result);
    expect(screen.getByTestId("location").textContent).toBe("/properties/p1");
  });
});
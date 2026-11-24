// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import SubmitNoticeForm from "./SubmitNoticeForm";

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SubmitNoticeForm />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SubmitNoticeForm", () => {
  it("rejects a move-out date less than 30 days out and skips submission", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    renderForm();

    fireEvent.change(screen.getByLabelText("Notice date"), {
      target: { value: "2026-01-01" },
    });
    fireEvent.change(screen.getByLabelText("Intended move-out date"), {
      target: { value: "2026-01-11" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit Notice" }));

    expect(
      screen.getByText("Must be at least 30 days from notice date."),
    ).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
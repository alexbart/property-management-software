// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const { downloadSpy } = vi.hoisted(() => ({ downloadSpy: vi.fn() }));

vi.mock("../hooks/useExportRentRoll", () => ({
  useExportRentRoll: () => ({ download: downloadSpy, isDownloading: false }),
}));

import ReconciliationDashboard from "./ReconciliationDashboard";

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ReconciliationDashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  downloadSpy.mockClear();
});

describe("ReconciliationDashboard", () => {
  it("shows an Export Rent Roll button that triggers a download", () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          totalRentDue: "20000",
          totalCollected: "15000",
          totalMaintenanceExpenses: "2500",
          estimatedNOI: "12500",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    renderPage();

    const button = screen.getByRole("button", {
      name: /Export Rent Roll/i,
    });
    expect(button).toBeTruthy();

    fireEvent.click(button);
    expect(downloadSpy).toHaveBeenCalledTimes(1);
  });
});
// @vitest-environment jsdom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useReconciliation } from "./useReconciliation";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useReconciliation", () => {
  it("returns the reconciliation summary from the API", async () => {
    const payload = {
      totalRentDue: "20000",
      totalCollected: "15000",
      totalMaintenanceExpenses: "2500",
      estimatedNOI: "12500",
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { result } = renderHook(
      () => useReconciliation("2026-01-01", "2026-02-01"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.estimatedNOI).toBe("12500");
    expect(result.current.data?.totalCollected).toBe("15000");

    const [url] = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(String(url)).toContain(
      "/api/v1/finance/properties/prop_123/reconciliation",
    );
    expect(String(url)).toContain("startDate=2026-01-01");
    // x-property-id header removed - using cookie-based auth now
  });
});
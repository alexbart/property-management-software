import { useQuery } from "@tanstack/react-query";
import { ReconciliationSummaryDto } from "@property-platform/contracts";
import { apiClient } from "../lib/api-client";

const DEFAULT_PROPERTY_ID = "prop_123";

function resolvePropertyId(): string {
  if (typeof window === "undefined") {
    return DEFAULT_PROPERTY_ID;
  }
  return window.localStorage.getItem("mock-property-id") ?? DEFAULT_PROPERTY_ID;
}

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currentMonthRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { startDate: toISODate(start), endDate: toISODate(end) };
}

export function useReconciliation(startDate?: string, endDate?: string) {
  const propertyId = resolvePropertyId();
  const range = currentMonthRange();
  const from = startDate ?? range.startDate;
  const to = endDate ?? range.endDate;

  return useQuery({
    queryKey: ["reconciliation", propertyId, from, to],
    queryFn: () => {
      const params = new URLSearchParams({
        startDate: from,
        endDate: to,
      });
      return apiClient<ReconciliationSummaryDto>(
        `/api/v1/finance/properties/${propertyId}/reconciliation?${params.toString()}`,
        { schema: ReconciliationSummaryDto },
      );
    },
    staleTime: 1000 * 60 * 5,
  });
}
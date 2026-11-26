import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";

export interface ResolvedMaintenanceTicket {
  id: string;
  title: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  actualCost: string | null;
  resolvedAt: string | null;
  unit: { unitNumber: string };
}

export function useResolvedMaintenanceTickets() {
  return useQuery({
    queryKey: ["resolved-maintenance-tickets"],
    queryFn: async (): Promise<ResolvedMaintenanceTicket[]> => {
      const response = await apiClient<{
        data: ResolvedMaintenanceTicket[];
      }>("/api/v1/maintenance/tickets?status=RESOLVED");

      return response.data.filter(
        (ticket) => Number(ticket.actualCost ?? 0) > 0,
      );
    },
    staleTime: 1000 * 60 * 5,
  });
}
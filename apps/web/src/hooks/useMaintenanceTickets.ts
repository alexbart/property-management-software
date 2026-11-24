import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CANCELLED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface MaintenanceTicketView {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
}

export function useMaintenanceTickets() {
  return useQuery({
    queryKey: ["maintenance-tickets"],
    queryFn: async (): Promise<MaintenanceTicketView[]> => {
      const response = await apiClient<{ data: MaintenanceTicketView[] }>(
        "/api/v1/maintenance/tickets",
      );
      return response.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}
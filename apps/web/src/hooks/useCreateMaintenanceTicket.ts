import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";
import type {
  MaintenanceTicketView,
  TicketPriority,
} from "./useMaintenanceTickets";

// Mock tenant/property context until authentication (ADR-004) is implemented.
export const MOCK_PROPERTY_ID = "11111111-1111-1111-1111-111111111111";
export const MOCK_UNIT_ID = "22222222-2222-2222-2222-222222222222";
export const MOCK_INITIATOR_ID = "tenant-1";

export interface CreateMaintenanceTicketInput {
  title: string;
  description: string;
  priority: TicketPriority;
}

export function useCreateMaintenanceTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateMaintenanceTicketInput) =>
      apiClient<{ data: MaintenanceTicketView }>(
        "/api/v1/maintenance/tickets",
        {
          method: "POST",
          body: JSON.stringify({
            propertyId: MOCK_PROPERTY_ID,
            unitId: MOCK_UNIT_ID,
            initiatedBy: "TENANT",
            initiatorId: MOCK_INITIATOR_ID,
            title: input.title,
            description: input.description,
            priority: input.priority,
          }),
        },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["maintenance-tickets"] });
    },
  });
}
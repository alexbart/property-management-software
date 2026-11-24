import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateTenantNoticeDto } from "@property-platform/contracts";
import { apiClient } from "../lib/api-client";

// Mock tenant context until authentication (ADR-004) is implemented.
export const MOCK_PROPERTY_ID = "11111111-1111-1111-1111-111111111111";
export const MOCK_LEASE_ID = "33333333-3333-3333-3333-333333333333";
export const MOCK_TENANT_ID = "44444444-4444-4444-4444-444444444444";

export type CreateNoticeInput = CreateTenantNoticeDto;

export function useCreateNotice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateNoticeInput) =>
      apiClient<{ data: unknown }>("/api/v1/tenants/notices", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tenant-notices"] });
      void queryClient.invalidateQueries({ queryKey: ["tenant-arrears"] });
    },
  });
}
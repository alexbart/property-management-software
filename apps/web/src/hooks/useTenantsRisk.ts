import { useQuery } from "@tanstack/react-query";
import { TenantListDto } from "@property-platform/contracts";
import { apiClient } from "../lib/api-client";

export function useTenantsRisk() {
  return useQuery({
    queryKey: ["tenant-risk-register"],
    queryFn: () =>
      apiClient<TenantListDto>("/api/v1/tenants", {
        schema: TenantListDto,
      }),
    staleTime: 1000 * 60 * 5,
  });
}
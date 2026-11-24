import { useQuery } from "@tanstack/react-query";
import { ArrearsSummaryDto } from "@property-platform/contracts";
import { apiClient } from "../lib/api-client";

export function useTenantArrears(leaseId: string) {
  return useQuery({
    queryKey: ["tenant-arrears", leaseId],
    queryFn: () =>
      apiClient<ArrearsSummaryDto>(
        `/api/v1/finance/leases/${leaseId}/arrears`,
        { schema: ArrearsSummaryDto },
      ),
    staleTime: 1000 * 60 * 5,
  });
}
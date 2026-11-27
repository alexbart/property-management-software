import { useQuery } from "@tanstack/react-query";
import type { SearchResultsDto } from "@property-platform/contracts";
import { apiClient } from "../lib/api-client";

export function useSearch(query: string) {
  return useQuery({
    queryKey: ["search", query],
    enabled: query.trim().length >= 2,
    queryFn: async (): Promise<SearchResultsDto> => {
      const response = await apiClient<{ data: SearchResultsDto }>(
        `/api/v1/search?q=${encodeURIComponent(query.trim())}`,
      );
      return response.data;
    },
  });
}
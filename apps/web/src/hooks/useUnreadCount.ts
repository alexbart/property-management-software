import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";

export function useUnreadCount() {
  return useQuery({
    queryKey: ["unread-count"],
    queryFn: async (): Promise<number> => {
      const response = await apiClient<{ data: { unreadCount: number } }>(
        "/api/v1/notifications/unread-count",
      );
      return response.data.unreadCount;
    },
    refetchInterval: 30000,
  });
}
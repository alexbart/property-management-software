import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";
import type { NotificationChannel, NotificationType } from "./useNotifications";

export interface PreferenceView {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  enabled: boolean;
}

export function usePreferences() {
  return useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async (): Promise<PreferenceView[]> => {
      const response = await apiClient<{ data: PreferenceView[] }>(
        "/api/v1/notifications/preferences",
      );
      return response.data;
    },
  });
}

export interface UpdatePreferenceInput {
  type: NotificationType;
  channel: NotificationChannel;
  enabled: boolean;
}

export function useUpdatePreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdatePreferenceInput) =>
      apiClient<{ data: PreferenceView }>(
        "/api/v1/notifications/preferences",
        {
          method: "PUT",
          body: JSON.stringify(input),
        },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["notification-preferences"],
      });
    },
  });
}
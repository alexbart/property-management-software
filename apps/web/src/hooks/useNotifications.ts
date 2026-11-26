import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";

export type NotificationType =
  | "PAYMENT_RECEIVED"
  | "PAYMENT_OVERDUE"
  | "MAINTENANCE_CREATED"
  | "MAINTENANCE_UPDATED"
  | "LEASE_EXPIRING_SOON"
  | "NOTICE_RECEIVED";

export type NotificationChannel = "IN_APP" | "EMAIL" | "SMS";

export type NotificationStatus = "UNREAD" | "READ";

export interface NotificationView {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  message: string;
  metadata: Record<string, unknown> | null;
  status: NotificationStatus;
  sentAt: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationList {
  notifications: NotificationView[];
  total: number;
  unreadCount: number;
}

export interface NotificationListParams {
  status?: NotificationStatus;
  limit?: number;
  offset?: number;
}

export function useNotifications(params: NotificationListParams = {}) {
  const { status, limit = 50, offset = 0 } = params;

  return useQuery({
    queryKey: ["notifications", { status, limit, offset }],
    queryFn: async (): Promise<NotificationList> => {
      const search = new URLSearchParams();
      if (status) search.set("status", status);
      search.set("limit", String(limit));
      search.set("offset", String(offset));

      const response = await apiClient<{ data: NotificationList }>(
        `/api/v1/notifications?${search.toString()}`,
      );
      return response.data;
    },
  });
}
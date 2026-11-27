/**
 * Centralised API endpoint builders. Components must not hard-code URLs.
 * The base URL and auth headers are applied by `apiClient`/`downloadFile`.
 */
export const endpoints = {
  health: () => "/api/v1/health",

  inventory: {
    amenities: () => "/api/v1/inventory/amenities",
    policies: () => "/api/v1/inventory/policies",
    effective: (params: {
      level: "PROPERTY" | "BUILDING" | "UNIT";
      propertyId: string;
      buildingId?: string;
      unitId?: string;
    }) => {
      const search = new URLSearchParams({ level: params.level, propertyId: params.propertyId });
      if (params.buildingId) search.set("buildingId", params.buildingId);
      if (params.unitId) search.set("unitId", params.unitId);
      return `/api/v1/inventory/effective?${search.toString()}`;
    },
  },

  reporting: {
    rentRoll: (propertyId: string) =>
      `/api/v1/reporting/properties/${propertyId}/rent-roll.csv`,
    receipt: (paymentId: string) =>
      `/api/v1/reporting/payments/${paymentId}/receipt.pdf`,
    maintenance: (propertyId: string, startDate: string, endDate: string) => {
      const search = new URLSearchParams({ startDate, endDate });
      return `/api/v1/reporting/properties/${propertyId}/maintenance.csv?${search.toString()}`;
    },
  },

  notifications: {
    list: (params?: { status?: "UNREAD" | "READ"; limit?: number; offset?: number }) => {
      const search = new URLSearchParams();
      if (params?.status) search.set("status", params.status);
      if (params?.limit) search.set("limit", String(params.limit));
      if (params?.offset) search.set("offset", String(params.offset));
      const qs = search.toString();
      return `/api/v1/notifications${qs ? `?${qs}` : ""}`;
    },
    unreadCount: () => "/api/v1/notifications/unread-count",
    markRead: (id: string) => `/api/v1/notifications/${id}/read`,
    markAllRead: () => "/api/v1/notifications/mark-all-read",
    preferences: () => "/api/v1/notifications/preferences",
  },
} as const;
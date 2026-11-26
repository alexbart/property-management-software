import { z } from "zod";

export const notificationTypeEnum = z.enum([
  "PAYMENT_RECEIVED",
  "PAYMENT_OVERDUE",
  "MAINTENANCE_CREATED",
  "MAINTENANCE_UPDATED",
  "LEASE_EXPIRING_SOON",
  "NOTICE_RECEIVED",
]);
export type NotificationType = z.infer<typeof notificationTypeEnum>;

export const notificationChannelEnum = z.enum(["IN_APP", "EMAIL", "SMS"]);
export type NotificationChannel = z.infer<typeof notificationChannelEnum>;

// Status is derived from the persisted isRead flag (the schema has no
// separate status column). UNREAD is the default for freshly created rows.
export const notificationStatusEnum = z.enum(["UNREAD", "READ"]);
export type NotificationStatus = z.infer<typeof notificationStatusEnum>;

export const NotificationDto = z.object({
  id: z.string().uuid(),
  type: notificationTypeEnum,
  channel: notificationChannelEnum,
  title: z.string(),
  message: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  status: notificationStatusEnum,
  sentAt: z.string().datetime().nullable(),
  readAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type NotificationDto = z.infer<typeof NotificationDto>;

export const NotificationListDto = z.object({
  notifications: z.array(NotificationDto),
  total: z.number().int().nonnegative(),
  unreadCount: z.number().int().nonnegative(),
});
export type NotificationListDto = z.infer<typeof NotificationListDto>;

export const NotificationPreferenceDto = z.object({
  id: z.string().uuid(),
  type: notificationTypeEnum,
  channel: notificationChannelEnum,
  enabled: z.boolean(),
});
export type NotificationPreferenceDto = z.infer<
  typeof NotificationPreferenceDto
>;

export const UpdatePreferenceDto = z.object({
  type: notificationTypeEnum,
  channel: notificationChannelEnum,
  enabled: z.boolean(),
});
export type UpdatePreferenceDto = z.infer<typeof UpdatePreferenceDto>;

export const NotificationListQueryDto = z.object({
  status: notificationStatusEnum.optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});
export type NotificationListQueryDto = z.infer<
  typeof NotificationListQueryDto
>;

export const NotificationParamsDto = z.object({
  id: z.string().uuid(),
});
export type NotificationParamsDto = z.infer<typeof NotificationParamsDto>;
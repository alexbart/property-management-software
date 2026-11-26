import { prisma } from "../../../database/prisma.js";
import { NotificationType, NotificationChannel, NotificationPreferenceType } from "@prisma/client";
import type { Prisma } from "@prisma/client";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  channel?: NotificationChannel;
  title: string;
  message: string;
  data?: Prisma.JsonObject;
}

export interface NotificationPreferenceInput {
  userId: string;
  type: NotificationPreferenceType;
  channel: NotificationChannel;
  enabled: boolean;
}

const DEFAULT_PREFERENCES: Record<NotificationPreferenceType, Partial<Record<NotificationChannel, boolean>>> = {
  PAYMENT_RECEIVED: { IN_APP: true, EMAIL: true, SMS: false },
  PAYMENT_OVERDUE: { IN_APP: true, EMAIL: true, SMS: true },
  MAINTENANCE_CREATED: { IN_APP: true, EMAIL: false, SMS: false },
  MAINTENANCE_UPDATED: { IN_APP: true, EMAIL: false, SMS: false },
  LEASE_EXPIRING_SOON: { IN_APP: true, EMAIL: true, SMS: false },
  NOTICE_RECEIVED: { IN_APP: true, EMAIL: true, SMS: false },
};

export async function createNotification(
  input: CreateNotificationInput,
): Promise<{ id: string } | null> {
  const { userId, type, channel = "IN_APP", title, message, data } = input;

  const shouldSend = await shouldSendNotification(userId, type, channel);
  if (!shouldSend) {
    return null;
  }

  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      channel,
      title,
      message,
      data,
    },
  });

  return { id: notification.id };
}

export async function shouldSendNotification(
  userId: string,
  type: NotificationType,
  channel: NotificationChannel,
): Promise<boolean> {
  const preference = await prisma.notificationPreference.findUnique({
    where: {
      userId_type_channel: {
        userId,
        type: type as NotificationPreferenceType,
        channel,
      },
    },
  });

  if (preference) {
    return preference.enabled;
  }

  const defaultEnabled = DEFAULT_PREFERENCES[type as NotificationPreferenceType]?.[channel] ?? false;
  return defaultEnabled;
}

export async function getOrCreatePreferences(
  userId: string,
): Promise<NotificationPreferenceInput[]> {
  const existing = await prisma.notificationPreference.findMany({
    where: { userId },
  });

  const results: NotificationPreferenceInput[] = [];

  for (const type of Object.values(NotificationPreferenceType)) {
    for (const channel of Object.values(NotificationChannel)) {
      const existingPref = existing.find(
        (p) => p.type === type && p.channel === channel,
      );

      if (existingPref) {
        results.push({
          userId,
          type,
          channel,
          enabled: existingPref.enabled,
        });
      } else {
        const defaultEnabled = DEFAULT_PREFERENCES[type]?.[channel] ?? false;
        const created = await prisma.notificationPreference.create({
          data: {
            userId,
            type,
            channel,
            enabled: defaultEnabled,
          },
        });
        results.push({
          userId,
          type,
          channel,
          enabled: created.enabled,
        });
      }
    }
  }

  return results;
}

export async function updatePreference(
  input: NotificationPreferenceInput,
) {
  return prisma.notificationPreference.upsert({
    where: {
      userId_type_channel: {
        userId: input.userId,
        type: input.type,
        channel: input.channel,
      },
    },
    update: { enabled: input.enabled },
    create: input,
  });
}

export async function getPreferences(userId: string) {
  return prisma.notificationPreference.findMany({
    where: { userId },
    orderBy: { type: "asc" },
  });
}

export async function getUserNotifications(
  userId: string,
  options?: { unreadOnly?: boolean; limit?: number; offset?: number },
) {
  const { unreadOnly = false, limit = 50, offset = 0 } = options || {};

  return prisma.notification.findMany({
    where: {
      userId,
      ...(unreadOnly ? { isRead: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}

export async function listNotifications(
  userId: string,
  options?: { status?: "UNREAD" | "READ"; limit?: number; offset?: number },
) {
  const { status, limit = 50, offset = 0 } = options || {};

  const where: Prisma.NotificationWhereInput = {
    userId,
    ...(status === "UNREAD" ? { isRead: false } : {}),
    ...(status === "READ" ? { isRead: true } : {}),
  };

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return { notifications, total, unreadCount };
}

export async function markAsRead(
  notificationId: string,
  userId: string,
): Promise<boolean> {
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true, readAt: new Date() },
  });
  return result.count > 0;
}

export async function markAllAsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}
import type { Request, Response } from "express";
import type { Notification } from "@prisma/client";
import { ZodError } from "zod";
import {
  NotificationListQueryDto,
  NotificationParamsDto,
  UpdatePreferenceDto,
  type NotificationDto,
} from "@property-platform/contracts";
import {
  getPreferences,
  listNotifications,
  markAllAsRead,
  markAsRead,
  getUnreadCount,
  updatePreference,
} from "../services/notification.service.js";

function scopeUserId(res: Response): string {
  return res.locals.userId as string;
}

function toNotificationDto(row: Notification): NotificationDto {
  return {
    id: row.id,
    type: row.type,
    channel: row.channel,
    title: row.title,
    message: row.message,
    metadata: (row.data as Record<string, unknown> | null) ?? null,
    status: row.isRead ? "READ" : "UNREAD",
    sentAt: row.createdAt.toISOString(),
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

function handleError(res: Response, error: unknown): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", issues: error.issues },
    });
    return;
  }

  res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
}

export async function listNotificationsHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const query = NotificationListQueryDto.parse(req.query);
    const userId = scopeUserId(res);

    const { notifications, total, unreadCount } = await listNotifications(
      userId,
      { status: query.status, limit: query.limit, offset: query.offset },
    );

    res.status(200).json({
      data: {
        notifications: notifications.map(toNotificationDto),
        total,
        unreadCount,
      },
    });
  } catch (error) {
    handleError(res, error);
  }
}

export async function unreadCountHandler(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const userId = scopeUserId(res);
    const unreadCount = await getUnreadCount(userId);
    res.status(200).json({ data: { unreadCount } });
  } catch (error) {
    handleError(res, error);
  }
}

export async function markReadHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { id } = NotificationParamsDto.parse(req.params);
    const userId = scopeUserId(res);

    const updated = await markAsRead(id, userId);
    if (!updated) {
      res.status(403).json({
        error: { code: "FORBIDDEN", message: "Notification not found for this user" },
      });
      return;
    }

    res.status(200).json({ data: { id, status: "READ" } });
  } catch (error) {
    handleError(res, error);
  }
}

export async function markAllReadHandler(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const userId = scopeUserId(res);
    await markAllAsRead(userId);
    res.status(200).json({ data: { status: "READ" } });
  } catch (error) {
    handleError(res, error);
  }
}

export async function getPreferencesHandler(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const userId = scopeUserId(res);
    const preferences = await getPreferences(userId);
    res.status(200).json({ data: preferences });
  } catch (error) {
    handleError(res, error);
  }
}

export async function updatePreferenceHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const body = UpdatePreferenceDto.parse(req.body);
    const userId = scopeUserId(res);

    const preference = await updatePreference({
      userId,
      type: body.type,
      channel: body.channel,
      enabled: body.enabled,
    });

    res.status(200).json({ data: preference });
  } catch (error) {
    handleError(res, error);
  }
}
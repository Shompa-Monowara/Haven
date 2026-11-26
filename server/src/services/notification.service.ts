import { logger } from "../lib/logger";
import {
  NotificationModel,
  type NotificationDocument,
} from "../models/notification.model";

type NotificationType =
  | "listing_decision"
  | "inquiry"
  | "message"
  | "saved_search"
  | "account"
  | "system";

interface CreateNotificationInput {
  user: string;
  type: NotificationType;
  title: string;
  body?: string;
  href?: string;
  metadata?: Record<string, unknown>;
}

export async function createNotification(input: CreateNotificationInput) {
  try {
    await NotificationModel.create(input);
  } catch (error) {
    logger.error({ err: error, userId: input.user, type: input.type }, "Notification creation failed");
  }
}

export async function createNotifications(inputs: CreateNotificationInput[]) {
  if (!inputs.length) return;
  try {
    await NotificationModel.insertMany(inputs);
  } catch (error) {
    logger.error({ err: error, count: inputs.length }, "Notification batch creation failed");
  }
}

function toDto(notification: NotificationDocument) {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body ?? "",
    href: notification.href ?? null,
    readAt: notification.readAt ?? null,
    createdAt: notification.createdAt,
  };
}

export async function listNotifications(userId: string, limit = 30) {
  const [notifications, unreadCount] = await Promise.all([
    NotificationModel.find({ user: userId }).sort({ createdAt: -1 }).limit(limit),
    NotificationModel.countDocuments({ user: userId, readAt: null }),
  ]);

  return {
    items: notifications.map(toDto),
    unreadCount,
  };
}

export async function unreadNotificationCount(userId: string) {
  return NotificationModel.countDocuments({ user: userId, readAt: null });
}

export async function markNotificationRead(userId: string, id: string) {
  await NotificationModel.updateOne(
    { _id: id, user: userId, readAt: null },
    { $set: { readAt: new Date() } },
  );
}

export async function markAllNotificationsRead(userId: string) {
  const result = await NotificationModel.updateMany(
    { user: userId, readAt: null },
    { $set: { readAt: new Date() } },
  );
  return { updated: result.modifiedCount };
}
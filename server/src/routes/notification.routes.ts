import { Router } from "express";
import { z } from "zod";

import { asyncHandler } from "../lib/async-handler";
import { requireAuth } from "../middleware/auth";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  unreadNotificationCount,
} from "../services/notification.service";

export const notificationRouter = Router();

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(60).default(30),
});

notificationRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const query = querySchema.parse(req.query);
    res.json({ data: await listNotifications(req.auth!.id, query.limit) });
  }),
);

notificationRouter.get(
  "/unread-count",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ data: { count: await unreadNotificationCount(req.auth!.id) } });
  }),
);

notificationRouter.post(
  "/read-all",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ data: await markAllNotificationsRead(req.auth!.id) });
  }),
);

notificationRouter.post(
  "/:id/read",
  requireAuth,
  asyncHandler(async (req, res) => {
    await markNotificationRead(req.auth!.id, req.params.id);
    res.json({ data: { ok: true } });
  }),
);
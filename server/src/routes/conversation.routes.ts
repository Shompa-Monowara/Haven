import { Router } from "express";

import { asyncHandler } from "../lib/async-handler";
import { requireAuth } from "../middleware/auth";
import { userRateLimit } from "../middleware/rate-limit";
import {
  getOrCreateConversation,
  listConversations,
  listMessages,
  markConversationRead,
  sendMessage,
  unreadConversationCount,
} from "../services/conversation.service";
import {
  conversationCreateSchema,
  messageSchema,
} from "../validation/engagement.schemas";

export const conversationRouter = Router();

const conversationCreateLimiter = userRateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: "You are starting conversations too quickly. Please try again shortly.",
});

const messageLimiter = userRateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 60,
  message: "You are sending messages too quickly. Please slow down.",
});

conversationRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ data: await listConversations(req.auth!.id) });
  }),
);

conversationRouter.get(
  "/unread-count",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ data: { count: await unreadConversationCount(req.auth!.id) } });
  }),
);

conversationRouter.post(
  "/",
  requireAuth,
  conversationCreateLimiter,
  asyncHandler(async (req, res) => {
    const payload = conversationCreateSchema.parse(req.body);
    const conversation = await getOrCreateConversation(
      req.auth!,
      payload.propertyId,
      payload.body,
    );
    res.status(201).json({ data: conversation });
  }),
);

conversationRouter.get(
  "/:id/messages",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ data: await listMessages(req.params.id, req.auth!) });
  }),
);

conversationRouter.post(
  "/:id/messages",
  requireAuth,
  messageLimiter,
  asyncHandler(async (req, res) => {
    const payload = messageSchema.parse(req.body);
    res.status(201).json({
      data: await sendMessage(
        req.params.id,
        req.auth!,
        payload.body ?? "",
        payload.attachments ?? [],
      ),
    });
  }),
);

conversationRouter.post(
  "/:id/read",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ data: await markConversationRead(req.params.id, req.auth!) });
  }),
);
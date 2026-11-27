import type { Server as HttpServer } from "node:http";

import { Server as SocketServer, type Socket } from "socket.io";

import { env } from "../config/env";
import { logger } from "./logger";
import { ConversationModel } from "../models/conversation.model";
import { UserModel } from "../models/user.model";
import { verifyAccessToken } from "../services/auth.service";

interface SocketUser {
  id: string;
  name: string;
  role: "buyer" | "agent" | "admin";
}

let io: SocketServer | null = null;
const onlineCounts = new Map<string, number>();

export function getIo(): SocketServer | null {
  return io;
}

export function emitToConversation(conversationId: string, event: string, payload: unknown) {
  io?.to(`conversation:${conversationId}`).emit(event, payload);
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload);
}

export function isUserOnline(userId: string) {
  return (onlineCounts.get(userId) ?? 0) > 0;
}

export function disconnectUser(userId: string) {
  io?.in(`user:${userId}`).disconnectSockets(true);
}

function incrementOnline(userId: string) {
  onlineCounts.set(userId, (onlineCounts.get(userId) ?? 0) + 1);
}

function decrementOnline(userId: string) {
  const next = (onlineCounts.get(userId) ?? 1) - 1;
  if (next <= 0) onlineCounts.delete(userId);
  else onlineCounts.set(userId, next);
  return next <= 0;
}

async function conversationMembers(conversationId: string) {
  const conversation = await ConversationModel.findById(conversationId)
    .select("buyer agent")
    .lean();

  if (!conversation) return null;
  return {
    buyer: conversation.buyer.toString(),
    agent: conversation.agent.toString(),
  };
}

async function canJoin(user: SocketUser, conversationId: string) {
  const members = await conversationMembers(conversationId);
  if (!members) return false;
  return members.buyer === user.id || members.agent === user.id || user.role === "admin";
}

export function initRealtime(httpServer: HttpServer) {
  if (io) return io;

  io = new SocketServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
      credentials: true,
    },
    path: "/socket.io",
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) throw new Error("Missing token");

      const payload = verifyAccessToken(token);
      const user = await UserModel.findById(payload.sub).select("name role status");
      if (!user || user.status === "suspended") throw new Error("Unauthorized");

      const data: SocketUser = { id: user.id, name: user.name, role: user.role };
      socket.data.user = data;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    const user = socket.data.user as SocketUser;
    incrementOnline(user.id);
    socket.join(`user:${user.id}`);

    const conversations = await ConversationModel.find({
      $or: [{ buyer: user.id }, { agent: user.id }],
    })
      .select("_id")
      .lean();

    const conversationIds = conversations.map((conversation) => conversation._id.toString());
    socket.data.conversationIds = conversationIds;

    for (const id of conversationIds) {
      socket.join(`conversation:${id}`);
      socket.to(`conversation:${id}`).emit("presence", { userId: user.id, online: true });
    }

    socket.on("conversation:join", async (payload: { conversationId?: string }) => {
      const conversationId = payload?.conversationId;
      if (!conversationId || !(await canJoin(user, conversationId))) return;
      socket.join(`conversation:${conversationId}`);

      const members = await conversationMembers(conversationId);
      if (members) {
        for (const memberId of [members.buyer, members.agent]) {
          if (memberId !== user.id && isUserOnline(memberId)) {
            socket.emit("presence", { userId: memberId, online: true });
          }
        }
      }
    });

    socket.on(
      "typing",
      async (payload: { conversationId?: string; isTyping?: boolean }) => {
        const conversationId = payload?.conversationId;
        if (!conversationId || !(await canJoin(user, conversationId))) return;
        socket.to(`conversation:${conversationId}`).emit("typing", {
          conversationId,
          userId: user.id,
          name: user.name,
          isTyping: Boolean(payload.isTyping),
        });
      },
    );

    socket.on("disconnect", () => {
      const wentOffline = decrementOnline(user.id);
      if (!wentOffline) return;
      for (const id of (socket.data.conversationIds as string[]) ?? []) {
        socket.to(`conversation:${id}`).emit("presence", { userId: user.id, online: false });
      }
    });

    logger.debug({ userId: user.id }, "Socket connected");
  });

  logger.info("Socket.IO attached");
  return io;
}

export async function closeRealtime() {
  if (io) {
    await io.close();
    io = null;
  }
  onlineCounts.clear();
}
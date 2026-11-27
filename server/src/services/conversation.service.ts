import { env } from "../config/env";
import { ApiError } from "../lib/api-error";
import { sendOfflineMessageEmail } from "../lib/email";
import { emitToConversation, emitToUser, isUserOnline } from "../lib/realtime";
import {
  ChatMessageModel,
  ConversationModel,
  type ChatMessageDocument,
  type ConversationDocument,
} from "../models/conversation.model";
import { PropertyModel, type PropertyDocument } from "../models/property.model";
import { UserModel } from "../models/user.model";
import { createNotification } from "./notification.service";
import { getPlatformSettings } from "./settings.service";

interface Viewer {
  id: string;
  role: "buyer" | "agent" | "admin";
}

interface MessageAttachment {
  url: string;
  name: string;
  type: string;
  size: number;
}

function coverUrl(property: PropertyDocument | null) {
  if (!property) return null;
  const image = [...property.images].sort(
    (a, b) => Number(b.isCover) - Number(a.isCover) || a.order - b.order,
  )[0];
  return image?.url ?? null;
}

function propertyContext(property: PropertyDocument | null) {
  if (!property) return null;
  return {
    id: property.id,
    slug: property.slug,
    title: property.title,
    city: property.address?.city ?? null,
    price: property.price,
    listingType: property.listingType,
    rentPeriod: property.rentPeriod ?? null,
    coverUrl: coverUrl(property),
  };
}

function messageDto(message: ChatMessageDocument) {
  return {
    id: message.id,
    conversationId: message.conversation.toString(),
    senderId: message.sender.toString(),
    body: message.body,
    attachments: message.attachments.map((attachment) => ({
      url: attachment.url,
      name: attachment.name,
      type: attachment.type,
      size: attachment.size,
    })),
    readBy: message.readBy.map((id) => id.toString()),
    createdAt: message.createdAt,
  };
}

function isParticipant(conversation: ConversationDocument, userId: string) {
  return (
    conversation.buyer.toString() === userId || conversation.agent.toString() === userId
  );
}

function unreadFor(conversation: ConversationDocument, userId: string) {
  return conversation.buyer.toString() === userId
    ? conversation.unreadForBuyer
    : conversation.unreadForAgent;
}

async function serializeConversations(
  conversations: ConversationDocument[],
  viewerId: string,
) {
  if (!conversations.length) return [];

  const counterpartIds = conversations.map((conversation) =>
    conversation.buyer.toString() === viewerId
      ? conversation.agent.toString()
      : conversation.buyer.toString(),
  );
  const propertyIds = conversations.map((conversation) => conversation.property.toString());

  const [users, properties] = await Promise.all([
    UserModel.find({ _id: { $in: [...new Set(counterpartIds)] } }).select("name avatar role"),
    PropertyModel.find({ _id: { $in: [...new Set(propertyIds)] } }).select(
      "title slug price listingType rentPeriod address images",
    ),
  ]);

  const userMap = new Map(users.map((user) => [user.id, user]));
  const propertyMap = new Map(properties.map((property) => [property.id, property]));

  return conversations.map((conversation) => {
    const counterpartId =
      conversation.buyer.toString() === viewerId
        ? conversation.agent.toString()
        : conversation.buyer.toString();
    const counterpart = userMap.get(counterpartId);
    const property = propertyMap.get(conversation.property.toString()) ?? null;

    return {
      id: conversation.id,
      property: propertyContext(property),
      counterpart: counterpart
        ? {
            id: counterpart.id,
            name: counterpart.name,
            avatar: counterpart.avatar?.url ?? null,
            role: counterpart.role,
          }
        : null,
      lastMessagePreview: conversation.lastMessagePreview,
      lastMessageAt: conversation.lastMessageAt,
      lastMessageSenderId: conversation.lastMessageSender?.toString() ?? null,
      unread: unreadFor(conversation, viewerId),
      createdAt: conversation.createdAt,
    };
  });
}

export async function listConversations(viewerId: string) {
  const conversations = await ConversationModel.find({
    $or: [{ buyer: viewerId }, { agent: viewerId }],
  }).sort({ lastMessageAt: -1 });

  return serializeConversations(conversations, viewerId);
}

export async function unreadConversationCount(viewerId: string) {
  const conversations = await ConversationModel.find({
    $or: [{ buyer: viewerId }, { agent: viewerId }],
  }).select("buyer unreadForBuyer unreadForAgent");

  return conversations.reduce(
    (total, conversation) => total + unreadFor(conversation, viewerId),
    0,
  );
}

export async function getOrCreateConversation(viewer: Viewer, propertyId: string, body?: string) {
  const property = await PropertyModel.findOne({ _id: propertyId, status: "approved" }).select(
    "agent",
  );

  if (!property) throw ApiError.notFound("That listing is not available for messaging");

  if (property.agent.toString() === viewer.id) {
    throw ApiError.badRequest("You cannot start a conversation about your own listing");
  }

  let conversation = await ConversationModel.findOne({
    property: property._id,
    buyer: viewer.id,
    agent: property.agent,
  });

  if (!conversation) {
    conversation = await ConversationModel.create({
      property: property._id,
      buyer: viewer.id,
      agent: property.agent,
      lastMessageAt: new Date(),
      lastMessagePreview: "",
    });
  }

  if (body?.trim()) {
    await addMessage(conversation, viewer.id, body.trim());
  }

  const [dto] = await serializeConversations([conversation], viewer.id);
  return dto;
}

async function loadConversationForViewer(id: string, viewer: Viewer) {
  const conversation = await ConversationModel.findById(id);
  if (!conversation) throw ApiError.notFound("That conversation could not be found");

  if (viewer.role !== "admin" && !isParticipant(conversation, viewer.id)) {
    throw ApiError.forbidden("You do not have access to this conversation");
  }

  return conversation;
}

export async function listMessages(id: string, viewer: Viewer) {
  const conversation = await loadConversationForViewer(id, viewer);

  const marked = await ChatMessageModel.updateMany(
    { conversation: conversation._id, sender: { $ne: viewer.id }, readBy: { $ne: viewer.id } },
    { $addToSet: { readBy: viewer.id } },
  );

  if (conversation.buyer.toString() === viewer.id) conversation.unreadForBuyer = 0;
  else conversation.unreadForAgent = 0;
  await conversation.save();

  if (marked.modifiedCount > 0) {
    emitToConversation(conversation.id, "conversation:read", {
      conversationId: conversation.id,
      userId: viewer.id,
      readAt: new Date().toISOString(),
    });
  }

  const messages = await ChatMessageModel.find({ conversation: conversation._id })
    .sort({ createdAt: 1 })
    .limit(300);

  const [dto] = await serializeConversations([conversation], viewer.id);

  return {
    conversation: dto,
    messages: messages.map(messageDto),
  };
}

export async function addMessage(
  conversation: ConversationDocument,
  senderId: string,
  body: string,
  attachments: MessageAttachment[] = [],
) {
  const message = await ChatMessageModel.create({
    conversation: conversation._id,
    sender: senderId,
    body,
    attachments,
    readBy: [senderId],
  });

  const recipientId =
    conversation.buyer.toString() === senderId
      ? conversation.agent.toString()
      : conversation.buyer.toString();

  const preview =
    body.trim() ||
    (attachments.length
      ? attachments.some((attachment) => attachment.type === "application/pdf")
        ? "Sent an attachment"
        : "Sent a photo"
      : "");

  conversation.lastMessageAt = message.createdAt;
  conversation.lastMessagePreview = preview.slice(0, 160);
  conversation.lastMessageSender = message.sender;
  if (conversation.buyer.toString() === senderId) {
    conversation.unreadForAgent += 1;
  } else {
    conversation.unreadForBuyer += 1;
  }
  await conversation.save();

  const recipientIsBuyer = conversation.buyer.toString() === recipientId;
  const sender = await UserModel.findById(senderId).select("name");
  await createNotification({
    user: recipientId,
    type: "message",
    title: `New message from ${sender?.name ?? "a Haven member"}`,
    body: preview.slice(0, 160),
    href: recipientIsBuyer
      ? `/account/messages/${conversation.id}`
      : `/agent/messages/${conversation.id}`,
  });

  emitToConversation(conversation.id, "message:new", {
    conversationId: conversation.id,
    message: messageDto(message),
  });
  emitToConversation(conversation.id, "conversation:updated", {
    conversationId: conversation.id,
    lastMessageAt: conversation.lastMessageAt,
    lastMessagePreview: conversation.lastMessagePreview,
    lastMessageSenderId: senderId,
  });
  emitToUser(recipientId, "message:new", {
    conversationId: conversation.id,
    message: messageDto(message),
  });
  emitToUser(recipientId, "conversation:updated", {
    conversationId: conversation.id,
    lastMessageAt: conversation.lastMessageAt,
    lastMessagePreview: conversation.lastMessagePreview,
    lastMessageSenderId: senderId,
  });

  if (!isUserOnline(recipientId)) {
    void notifyOfflineRecipient(conversation, senderId, recipientId, preview);
  }

  return messageDto(message);
}

async function notifyOfflineRecipient(
  conversation: ConversationDocument,
  senderId: string,
  recipientId: string,
  body: string,
) {
  const [recipient, sender, property] = await Promise.all([
    UserModel.findById(recipientId).select("name email"),
    UserModel.findById(senderId).select("name"),
    PropertyModel.findById(conversation.property).select("title"),
  ]);

  if (!recipient || !sender) return;

  const settings = await getPlatformSettings();
  if (settings.notifications.offlineMessageEmails) {
    await sendOfflineMessageEmail({
      to: recipient.email,
      recipientName: recipient.name,
      senderName: sender.name,
      propertyTitle: property?.title ?? "a saved home",
      preview: body.slice(0, 160),
      conversationUrl: `${env.CORS_ORIGIN}${
        recipientId === conversation.agent.toString()
          ? `/agent/messages/${conversation.id}`
          : `/account/messages/${conversation.id}`
      }`,
    });
  }
}

export async function sendMessage(
  id: string,
  viewer: Viewer,
  body: string,
  attachments: MessageAttachment[] = [],
) {
  const conversation = await loadConversationForViewer(id, viewer);
  const message = await addMessage(conversation, viewer.id, body.trim(), attachments);
  return message;
}

export async function markConversationRead(id: string, viewer: Viewer) {
  const conversation = await loadConversationForViewer(id, viewer);

  const marked = await ChatMessageModel.updateMany(
    { conversation: conversation._id, sender: { $ne: viewer.id }, readBy: { $ne: viewer.id } },
    { $addToSet: { readBy: viewer.id } },
  );

  if (conversation.buyer.toString() === viewer.id) conversation.unreadForBuyer = 0;
  else conversation.unreadForAgent = 0;
  await conversation.save();

  if (marked.modifiedCount > 0) {
    emitToConversation(conversation.id, "conversation:read", {
      conversationId: conversation.id,
      userId: viewer.id,
      readAt: new Date().toISOString(),
    });
  }

  return { ok: true };
}
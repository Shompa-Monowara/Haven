import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const conversationSchema = new Schema(
  {
    property: { type: Schema.Types.ObjectId, ref: "Property", required: true, index: true },
    buyer: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    agent: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    lastMessageAt: { type: Date, default: Date.now },
    lastMessagePreview: { type: String, trim: true, maxlength: 160, default: "" },
    lastMessageSender: { type: Schema.Types.ObjectId, ref: "User" },
    unreadForBuyer: { type: Number, default: 0, min: 0 },
    unreadForAgent: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

conversationSchema.index({ buyer: 1, lastMessageAt: -1 });
conversationSchema.index({ agent: 1, lastMessageAt: -1 });
conversationSchema.index({ property: 1, buyer: 1, agent: 1 }, { unique: true });

export type Conversation = InferSchemaType<typeof conversationSchema>;
export type ConversationDocument = HydratedDocument<Conversation>;

export const ConversationModel = model("Conversation", conversationSchema);

const attachmentSchema = new Schema(
  {
    url: { type: String, required: true, maxlength: 500 },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    type: { type: String, required: true, maxlength: 100 },
    size: { type: Number, required: true, min: 0, max: 10 * 1024 * 1024 },
  },
  { _id: false },
);

const messageSchema = new Schema(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, trim: true, maxlength: 4000, default: "" },
    attachments: { type: [attachmentSchema], default: [] },
    readBy: { type: [Schema.Types.ObjectId], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

messageSchema.index({ conversation: 1, createdAt: 1 });
messageSchema.index({ conversation: 1, sender: 1 });

export type ChatMessage = InferSchemaType<typeof messageSchema>;
export type ChatMessageDocument = HydratedDocument<ChatMessage>;

export const ChatMessageModel = model("ChatMessage", messageSchema);
import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, maxlength: 24 },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["buyer", "agent", "admin"],
      default: "buyer",
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "pending_approval", "suspended"],
      default: "active",
      index: true,
    },
    avatar: {
      url: { type: String, trim: true },
      publicId: { type: String, trim: true },
    },
    emailVerifiedAt: { type: Date },
    lastLoginAt: { type: Date },
    suspendedAt: { type: Date },
    suspendedBy: { type: Schema.Types.ObjectId, ref: "User" },
    suspensionReason: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true },
);

export type User = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<User>;
export type UserRole = User["role"];

export const UserModel = model("User", userSchema);
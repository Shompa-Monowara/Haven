import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const passwordResetTokenSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type PasswordResetToken = InferSchemaType<typeof passwordResetTokenSchema>;
export type PasswordResetTokenDocument = HydratedDocument<PasswordResetToken>;

export const PasswordResetTokenModel = model("PasswordResetToken", passwordResetTokenSchema);
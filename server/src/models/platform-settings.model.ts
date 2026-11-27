import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const platformSettingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, immutable: true },
    review: {
      standardReviewBusinessDays: { type: Number, min: 1, max: 10, default: 1 },
    },
    notifications: {
      listingDecisionEmails: { type: Boolean, default: true },
      offlineMessageEmails: { type: Boolean, default: true },
      savedSearchDigests: { type: Boolean, default: true },
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export type PlatformSettings = InferSchemaType<typeof platformSettingsSchema>;
export type PlatformSettingsDocument = HydratedDocument<PlatformSettings>;

export const PlatformSettingsModel = model("PlatformSettings", platformSettingsSchema);
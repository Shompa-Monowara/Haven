import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const savedSearchSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    criteria: { type: String, trim: true, maxlength: 2000, default: "" },
    frequency: {
      type: String,
      enum: ["off", "instant", "daily", "weekly"],
      default: "daily",
    },
    emailAlerts: { type: Boolean, default: true },
    inAppAlerts: { type: Boolean, default: true },
    lastRunAt: { type: Date },
    lastDigestAt: { type: Date },
    lastNotifiedPropertyIds: { type: [Schema.Types.ObjectId], default: [] },
  },
  { timestamps: true },
);

savedSearchSchema.index({ user: 1, createdAt: -1 });

export type SavedSearch = InferSchemaType<typeof savedSearchSchema>;
export type SavedSearchDocument = HydratedDocument<SavedSearch>;

export const SavedSearchModel = model("SavedSearch", savedSearchSchema);
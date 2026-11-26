import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const agentProfileSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    agency: { type: String, required: true, trim: true, maxlength: 120 },
    bio: { type: String, trim: true, maxlength: 800 },
    licenseNumber: { type: String, trim: true, maxlength: 60 },
    verified: { type: Boolean, default: false },
    serviceAreas: { type: [String], default: [] },
    responseTimeMinutes: { type: Number, default: 120, min: 5 },
  },
  { timestamps: true },
);

export type AgentProfile = InferSchemaType<typeof agentProfileSchema>;
export type AgentProfileDocument = HydratedDocument<AgentProfile>;

export const AgentProfileModel = model("AgentProfile", agentProfileSchema);
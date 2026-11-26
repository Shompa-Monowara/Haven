import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

export const INQUIRY_TOPICS = [
  "buying",
  "renting",
  "selling",
  "valuation",
  "other",
] as const;

export const INQUIRY_CONTACT_METHODS = ["email", "phone"] as const;
export const INQUIRY_SOURCES = ["property", "agent_profile"] as const;

export const INQUIRY_TOPIC_LABELS: Record<(typeof INQUIRY_TOPICS)[number], string> = {
  buying: "Buying a home",
  renting: "Renting a home",
  selling: "Selling or listing a property",
  valuation: "Valuation or market advice",
  other: "Something else",
};

const inquirySchema = new Schema(
  {
    // Property inquiries set `property`; general agent enquiries leave it unset.
    property: { type: Schema.Types.ObjectId, ref: "Property", index: true },
    // Guests can enquire without an account, so `buyer` is optional.
    buyer: { type: Schema.Types.ObjectId, ref: "User", index: true },
    agent: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, trim: true, maxlength: 24 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    tourDate: { type: Date },
    consent: { type: Boolean, required: true },
    topic: { type: String, enum: INQUIRY_TOPICS },
    contactMethod: { type: String, enum: INQUIRY_CONTACT_METHODS },
    source: {
      type: String,
      enum: INQUIRY_SOURCES,
      default: "property",
      index: true,
    },
    status: {
      type: String,
      enum: ["new", "contacted", "qualified", "closed", "spam"],
      default: "new",
      index: true,
    },
    notes: { type: [String], default: [] },
  },
  { timestamps: true },
);

inquirySchema.index({ agent: 1, status: 1, createdAt: -1 });
inquirySchema.index({ buyer: 1, createdAt: -1 });

export type Inquiry = InferSchemaType<typeof inquirySchema>;
export type InquiryDocument = HydratedDocument<Inquiry>;

export const InquiryModel = model("Inquiry", inquirySchema);

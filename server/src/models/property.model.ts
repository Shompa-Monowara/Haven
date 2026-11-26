import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const imageSchema = new Schema(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, trim: true },
    alt: { type: String, trim: true, maxlength: 160 },
    isCover: { type: Boolean, default: false },
    order: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const addressSchema = new Schema(
  {
    street: { type: String, trim: true, maxlength: 140 },
    city: { type: String, trim: true, maxlength: 80 },
    state: { type: String, trim: true, maxlength: 60 },
    zip: { type: String, trim: true, maxlength: 16 },
    country: { type: String, trim: true, maxlength: 60, default: "United States" },
    neighborhood: { type: String, trim: true, maxlength: 80 },
  },
  { _id: false },
);

const pointSchema = new Schema(
  {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: {
      type: [Number],
      validate: {
        validator: (value: number[]) =>
          value.length === 2 &&
          Number.isFinite(value[0]) &&
          Number.isFinite(value[1]) &&
          value[0] >= -180 &&
          value[0] <= 180 &&
          value[1] >= -90 &&
          value[1] <= 90,
        message: "Location must be a valid longitude/latitude pair",
      },
    },
  },
  { _id: false },
);

const propertySchema = new Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 5, maxlength: 140 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true, maxlength: 8000, default: "" },
    listingType: { type: String, enum: ["sale", "rent"], required: true },
    propertyType: {
      type: String,
      enum: ["apartment", "house", "villa", "studio", "condo", "office", "shop"],
      required: true,
    },
    price: { type: Number, min: 0, default: 0 },
    rentPeriod: { type: String, enum: ["monthly", "weekly", "nightly"] },
    pricePerSqft: { type: Number, min: 0 },
    beds: { type: Number, min: 0, max: 30, default: 0 },
    baths: { type: Number, min: 0, max: 30, default: 0 },
    garages: { type: Number, min: 0, max: 20, default: 0 },
    sizeSqft: { type: Number, min: 0, default: 0 },
    lotSizeSqft: { type: Number, min: 0 },
    yearBuilt: { type: Number, min: 1700, max: 2200 },
    address: { type: addressSchema, default: () => ({ country: "United States" }) },
    location: { type: pointSchema },
    amenities: { type: [String], default: [] },
    images: { type: [imageSchema], default: [] },
    agent: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: ["draft", "pending", "approved", "changes_requested", "rejected", "archived"],
      default: "draft",
      index: true,
    },
    featured: { type: Boolean, default: false, index: true },
    featuredUntil: { type: Date },
    hiddenBySuspension: { type: Boolean, default: false, index: true },
    views: { type: Number, default: 0, min: 0 },
    rejectionReason: {
      category: {
        type: String,
        enum: [
          "incomplete_information",
          "poor_photos",
          "inaccurate_pricing",
          "duplicate",
          "policy_violation",
        ],
      },
      note: { type: String, trim: true, maxlength: 1000 },
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    submittedAt: { type: Date },
    publishedAt: { type: Date },
    archivedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        delete ret.id;
        return ret;
      },
    },
  },
);

propertySchema.index({ status: 1, listingType: 1, propertyType: 1, price: 1 });
propertySchema.index({ status: 1, publishedAt: -1 });
propertySchema.index({ featured: 1, status: 1 });
propertySchema.index({ "address.city": 1 });
propertySchema.index({ "address.neighborhood": 1 });
propertySchema.index({ location: "2dsphere" });
propertySchema.index({ agent: 1, status: 1 });
propertySchema.index({
  title: "text",
  description: "text",
  "address.city": "text",
  "address.neighborhood": "text",
});

propertySchema.pre("save", function computePricePerSqft(next) {
  if (this.listingType === "sale" && this.price > 0 && this.sizeSqft > 0) {
    this.pricePerSqft = Math.round((this.price / this.sizeSqft) * 100) / 100;
  } else {
    this.pricePerSqft = undefined;
  }

  if (this.listingType === "sale") {
    this.rentPeriod = undefined;
  }

  next();
});

export type Property = InferSchemaType<typeof propertySchema>;
export type PropertyDocument = HydratedDocument<Property>;
export type PropertyStatus = Property["status"];
export type ListingType = Property["listingType"];
export type PropertyType = Property["propertyType"];
export type PropertyImage = Property["images"][number];

export const PropertyModel = model("Property", propertySchema);
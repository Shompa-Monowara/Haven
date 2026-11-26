import { z } from "zod";

export const LISTING_TYPES = ["sale", "rent"] as const;
export const PROPERTY_TYPES = [
  "apartment",
  "house",
  "villa",
  "studio",
  "condo",
  "office",
  "shop",
] as const;
export const PROPERTY_STATUSES = [
  "draft",
  "pending",
  "approved",
  "changes_requested",
  "rejected",
  "archived",
] as const;

export const REJECTION_CATEGORIES = [
  "incomplete_information",
  "poor_photos",
  "inaccurate_pricing",
  "duplicate",
  "policy_violation",
] as const;

const imageSchema = z.object({
  url: z.string().trim().min(1, "Image URL is required").max(500),
  publicId: z.string().trim().max(300).optional(),
  alt: z.string().trim().max(160).optional(),
  isCover: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});

const addressSchema = z.object({
  street: z.string().trim().max(140).optional(),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(60).optional(),
  zip: z.string().trim().max(16).optional(),
  country: z.string().trim().max(60).optional(),
  neighborhood: z.string().trim().max(80).optional(),
});

const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const baseFields = {
  title: z.string().trim().min(5, "Use at least 5 characters").max(140, "Title is too long"),
  description: z.string().trim().max(8000).optional(),
  listingType: z.enum(LISTING_TYPES),
  propertyType: z.enum(PROPERTY_TYPES),
  price: z.number().min(0).max(1_000_000_000).optional(),
  rentPeriod: z.enum(["monthly", "weekly", "nightly"]).nullable().optional(),
  beds: z.number().min(0).max(30).optional(),
  baths: z.number().min(0).max(30).optional(),
  garages: z.number().min(0).max(20).optional(),
  sizeSqft: z.number().min(0).max(10_000_000).optional(),
  lotSizeSqft: z.number().min(0).max(100_000_000).nullable().optional(),
  yearBuilt: z.number().int().min(1700).max(2200).nullable().optional(),
  address: addressSchema.optional(),
  location: locationSchema.nullable().optional(),
  amenities: z.array(z.string().trim().min(1).max(60)).max(40).optional(),
  images: z.array(imageSchema).max(20, "A listing can have at most 20 photos").optional(),
  featured: z.boolean().optional(),
};

export const createPropertySchema = z.object(baseFields);

export const updatePropertySchema = z
  .object(baseFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: "No changes supplied" });

export const propertyListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  listingType: z.enum(LISTING_TYPES).optional(),
  propertyType: z
    .string()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(",")
            .map((item) => item.trim())
            .filter((item): item is (typeof PROPERTY_TYPES)[number] =>
              (PROPERTY_TYPES as readonly string[]).includes(item),
            )
        : undefined,
    ),
  city: z.string().trim().max(80).optional(),
  neighborhood: z.string().trim().max(80).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  beds: z.coerce.number().min(0).max(30).optional(),
  baths: z.coerce.number().min(0).max(30).optional(),
  minSize: z.coerce.number().min(0).optional(),
  maxSize: z.coerce.number().min(0).optional(),
  amenities: z
    .string()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(",")
            .map((item) => item.trim().toLowerCase())
            .filter(Boolean)
        : undefined,
    ),
  bounds: z
    .string()
    .regex(
      /^-?\d+(\.\d+)?(,-?\d+(\.\d+)?){3}$/,
      "Bounds must be swLng,swLat,neLng,neLat",
    )
    .transform((value) => value.split(",").map(Number) as [number, number, number, number])
    .superRefine((value, ctx) => {
      const [swLng, swLat, neLng, neLat] = value;
      if (
        swLng < -180 ||
        swLng > 180 ||
        neLng < -180 ||
        neLng > 180 ||
        swLat < -90 ||
        swLat > 90 ||
        neLat < -90 ||
        neLat > 90
      ) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Bounds are outside valid coordinates" });
      }
      if (swLng >= neLng || swLat >= neLat) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Bounds must have a positive area" });
      }
    })
    .optional(),
  featured: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
  sort: z.enum(["newest", "relevance", "price_asc", "price_desc", "size_desc"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(24),
});

export const adminDecisionSchema = z
  .object({
    status: z.enum(["approved", "rejected", "changes_requested"]),
    reasonCategory: z.enum(REJECTION_CATEGORIES).optional(),
    note: z.string().trim().max(1000).optional(),
    featured: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.status !== "approved" && !value.reasonCategory) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reasonCategory"],
        message: "Choose a reason category for this decision",
      });
    }
  });

export const inquirySchema = z.object({
  propertyId: z.string().trim().min(1, "Property is required"),
  name: z.string().trim().min(2, "Enter your full name").max(80),
  email: z.string().trim().email("Enter a valid email address").max(254).toLowerCase(),
  phone: z.string().trim().max(24).optional(),
  message: z
    .string()
    .trim()
    .min(10, "Add a short message")
    .max(2000, "Message is too long"),
  tourDate: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || !Number.isNaN(Date.parse(value)), "Enter a valid date"),
  consent: z.literal(true, {
    error: "Accept the terms to send an inquiry",
  }),
});

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
export type PropertyListQuery = z.infer<typeof propertyListQuerySchema>;
export type AdminDecisionInput = z.infer<typeof adminDecisionSchema>;
export type InquiryInput = z.infer<typeof inquirySchema>;
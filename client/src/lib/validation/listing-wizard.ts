import { z } from "zod";

import { PROPERTY_TYPES, type PropertyType } from "@/types/property";

function numberField(
  label: string,
  { min, max, integer = false }: { min: number; max: number; integer?: boolean },
  optional = false,
) {
  return z.string().trim().superRefine((value, ctx) => {
    if (!value) {
      if (!optional) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Enter ${label}` });
      }
      return;
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Enter a valid ${label}` });
      return;
    }
    if (parsed < min || parsed > max) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} must be between ${min} and ${max}` });
    }
    if (integer && !Number.isInteger(parsed)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} must be a whole number` });
    }
  });
}

export const wizardSchema = z.object({
  title: z
    .string()
    .trim()
    .min(8, "Use at least 8 characters")
    .max(120, "Keep the title under 120 characters"),
  listingType: z.enum(["sale", "rent"], {
    error: "Choose for sale or for rent",
  }),
  propertyType: z.enum([...PROPERTY_TYPES] as [PropertyType, ...PropertyType[]], {
    error: "Choose a property type",
  }),
  description: z
    .string()
    .trim()
    .min(40, "Write at least 40 characters so buyers know what makes this home special")
    .max(4000, "Keep the description under 4,000 characters"),
  street: z.string().trim().min(5, "Enter the street address").max(140),
  city: z.string().trim().min(2, "Enter the city").max(80),
  state: z.string().trim().min(2, "Enter the state or region").max(60),
  zip: z.string().trim().min(3, "Enter the ZIP or postal code").max(12),
  country: z.string().trim().min(2, "Enter the country").max(60),
  neighborhood: z.string().trim().max(80).optional(),
  latitude: numberField("latitude", { min: -90, max: 90 }),
  longitude: numberField("longitude", { min: -180, max: 180 }),
  beds: numberField("bedrooms", { min: 0, max: 30 }, true),
  baths: numberField("bathrooms", { min: 0, max: 30 }, true),
  garages: numberField("garages", { min: 0, max: 20, integer: true }, true),
  sizeSqft: numberField("living area", { min: 100, max: 100_000 }),
  lotSizeSqft: numberField("lot size", { min: 0, max: 10_000_000 }, true),
  yearBuilt: numberField("year built", { min: 1700, max: 2100, integer: true }, true),
  amenities: z.array(z.string()).default([]),
  price: numberField("a price", { min: 1, max: 1_000_000_000 }),
  rentPeriod: z.union([z.enum(["monthly", "weekly", "nightly"]), z.literal("")]).default("monthly"),
});

export type WizardValues = z.infer<typeof wizardSchema>;

export const stepFields: Array<Array<keyof WizardValues>> = [
  ["title", "listingType", "propertyType", "description"],
  ["street", "city", "state", "zip", "country", "neighborhood", "latitude", "longitude"],
  ["beds", "baths", "garages", "sizeSqft", "lotSizeSqft", "yearBuilt", "amenities"],
  [],
  ["price", "rentPeriod"],
];

export const wizardSteps = [
  { title: "Basics", hint: "What you are listing" },
  { title: "Location", hint: "Where it is" },
  { title: "Details", hint: "Size and features" },
  { title: "Photos", hint: "At least three" },
  { title: "Pricing", hint: "Price and terms" },
  { title: "Review", hint: "Check and submit" },
];
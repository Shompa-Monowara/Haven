import { z } from "zod";

import { INQUIRY_CONTACT_METHODS, INQUIRY_TOPICS } from "../models/inquiry.model";

export const savedSearchCreateSchema = z.object({
  name: z.string().trim().min(1, "Name this search").max(80, "Keep the name under 80 characters"),
  criteria: z.string().trim().max(2000).default(""),
  frequency: z.enum(["off", "instant", "daily", "weekly"]).default("daily"),
  emailAlerts: z.boolean().default(true),
  inAppAlerts: z.boolean().default(true),
});

export const savedSearchUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    frequency: z.enum(["off", "instant", "daily", "weekly"]).optional(),
    emailAlerts: z.boolean().optional(),
    inAppAlerts: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "No changes supplied" });

export const inquiryStatuses = ["new", "contacted", "qualified", "closed", "spam"] as const;

export const inquiryUpdateSchema = z.object({
  status: z.enum(inquiryStatuses).optional(),
  note: z.string().trim().min(1).max(1000).optional(),
});

export const inquiryListQuerySchema = z.object({
  status: z.enum(inquiryStatuses).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(24),
});

const phoneAllowedChars = /^[+()\d\s.-]+$/;

function isReasonablePhone(value: string): boolean {
  if (!phoneAllowedChars.test(value)) return false;
  const digits = value.match(/\d/g)?.length ?? 0;
  return digits >= 7 && digits <= 20;
}

function linkCount(value: string): number {
  return (value.match(/https?:\/\/|www\./gi) ?? []).length;
}

export const contactAgentSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Enter your full name")
      .max(80, "Keep your name under 80 characters"),
    email: z.string().trim().email("Enter a valid email address").max(254).toLowerCase(),
    phone: z.string().trim().max(24).optional(),
    topic: z.enum(INQUIRY_TOPICS, { error: "Choose what you need help with" }),
    contactMethod: z.enum(INQUIRY_CONTACT_METHODS, { error: "Choose how to be contacted" }),
    message: z
      .string()
      .trim()
      .min(20, "Add at least 20 characters")
      .max(2000, "Keep your message under 2,000 characters"),
    propertyId: z.string().trim().min(1).optional(),
    consent: z.literal(true, { error: "Accept the privacy policy to send your message" }),
    website: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.phone && !isReasonablePhone(value.phone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "Enter a valid phone number",
      });
    }

    if (value.contactMethod === "phone" && !value.phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "Add a phone number for phone contact",
      });
    }

    if (linkCount(value.message) > 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["message"],
        message: "Remove the links from your message",
      });
    }
  });

export type ContactAgentInput = z.infer<typeof contactAgentSchema>;

const chatAttachmentSchema = z.object({
  url: z.string().trim().min(1).max(500),
  name: z.string().trim().min(1).max(120),
  type: z.string().trim().min(1).max(100),
  size: z.number().int().min(0).max(10 * 1024 * 1024),
});

export const messageSchema = z
  .object({
    body: z.string().trim().max(4000, "Keep messages under 4,000 characters").optional(),
    attachments: z.array(chatAttachmentSchema).max(3, "Attach up to 3 files").optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.body?.trim() && !value.attachments?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["body"],
        message: "Write a message or attach a file",
      });
    }
  });

export const conversationCreateSchema = z.object({
  propertyId: z.string().trim().min(1),
  body: z.string().trim().max(4000).optional(),
});

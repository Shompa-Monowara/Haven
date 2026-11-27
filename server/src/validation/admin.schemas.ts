import { z } from "zod";

export const adminUserQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  role: z.enum(["buyer", "agent", "admin"]).optional(),
  status: z.enum(["active", "pending_approval", "suspended"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(24),
});

export const adminUserUpdateSchema = z
  .object({
    status: z.enum(["active", "suspended"]).optional(),
    reason: z.string().trim().max(1000).optional(),
    verified: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "No changes supplied" });

export const bulkApproveSchema = z.object({
  ids: z
    .array(z.string().regex(/^[a-f0-9]{24}$/i, "Invalid listing id"))
    .min(1, "Choose at least one listing")
    .max(50),
});

export const adminAuditQuerySchema = z.object({
  entity: z.enum(["Property", "User", "AgentProfile"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(30),
});

export const platformSettingsUpdateSchema = z
  .object({
    review: z
      .object({
        standardReviewBusinessDays: z
          .number()
          .int()
          .min(1, "Use at least 1 business day")
          .max(10, "Use at most 10 business days")
          .optional(),
      })
      .strict()
      .optional(),
    notifications: z
      .object({
        listingDecisionEmails: z.boolean().optional(),
        offlineMessageEmails: z.boolean().optional(),
        savedSearchDigests: z.boolean().optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.review?.standardReviewBusinessDays !== undefined ||
      value.notifications?.listingDecisionEmails !== undefined ||
      value.notifications?.offlineMessageEmails !== undefined ||
      value.notifications?.savedSearchDigests !== undefined,
    { message: "No changes supplied" },
  );
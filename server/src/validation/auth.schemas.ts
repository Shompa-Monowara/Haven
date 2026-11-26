import { z } from "zod";

const email = z
  .string({ error: "Enter your email address" })
  .trim()
  .min(3, "Enter your email address")
  .max(254, "Email is too long")
  .email("Enter a valid email address")
  .transform((value) => value.toLowerCase());

const password = z
  .string({ error: "Enter a password" })
  .min(8, "Use at least 8 characters")
  .max(72, "Use 72 characters or fewer")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/[0-9]/, "Include at least one number");

const phone = z
  .union([z.string().trim().min(7, "Enter a valid phone number").max(24, "Phone number is too long"), z.literal("")])
  .optional();

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name").max(80, "Name is too long"),
    email,
    phone,
    password,
    role: z.enum(["buyer", "agent"], { error: "Choose an account type" }),
    agency: z.string().trim().max(120).optional(),
    licenseNumber: z.string().trim().max(60).optional(),
    consent: z.literal(true, {
      error: "Accept the terms to create an account",
    }),
  })
  .superRefine((value, ctx) => {
    if (value.role === "agent" && (!value.agency || value.agency.trim().length < 2)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["agency"],
        message: "Enter your agency name",
      });
    }
  });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string().min(10, "Reset link is invalid"),
  password,
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80, "Name is too long"),
  phone,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: password,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
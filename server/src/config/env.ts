import path from "node:path";
import dotenv from "dotenv";

// Local development loads server/.env. In production (Render) there is no
// .env file; variables come from the platform's environment settings.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().max(65535).default(4000),
    CORS_ORIGIN: z.string().default("http://localhost:5173"),
    // Trust X-Forwarded-* from the platform proxy so req.ip (and IP rate
    // limiting) sees the real client. Defaults to one hop for Render/Railway;
    // set "true" only for a fully trusted chain, or an IP/subnet list.
    TRUST_PROXY: z.string().min(1).default("1"),
    MONGO_URI: z.string().min(1).optional(),
    JWT_ACCESS_SECRET: z.string().min(32).optional(),
    JWT_REFRESH_SECRET: z.string().min(32).optional(),
    ACCESS_TOKEN_TTL: z.string().default("15m"),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
    UPLOAD_DIR: z.string().min(1).optional(),
    SMTP_HOST: z.string().min(1).optional(),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
    SMTP_SECURE: z.enum(["true", "false"]).default("false"),
    SMTP_USER: z.string().min(1).optional(),
    SMTP_PASS: z.string().min(1).optional(),
    SMTP_FROM: z.string().min(3).default("Haven <no-reply@haven.test>"),
    BREVO_API_KEY: z.string().min(1).optional(),
    // Optional Cloudinary storage. When all three are set, uploads go to
    // Cloudinary; otherwise they are written to UPLOAD_DIR on local disk.
    CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
    CLOUDINARY_API_KEY: z.string().min(1).optional(),
    CLOUDINARY_API_SECRET: z.string().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.SMTP_HOST && (value.SMTP_USER === undefined) !== (value.SMTP_PASS === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SMTP_USER"],
        message: "SMTP_USER and SMTP_PASS must be provided together",
      });
    }

    if (value.SMTP_HOST && !value.SMTP_FROM.includes("@")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SMTP_FROM"],
        message: "SMTP_FROM must be a valid sender address",
      });
    }

    const cloudinaryValues = [
      value.CLOUDINARY_CLOUD_NAME,
      value.CLOUDINARY_API_KEY,
      value.CLOUDINARY_API_SECRET,
    ];
    const cloudinaryCount = cloudinaryValues.filter((entry) => entry !== undefined).length;
    if (cloudinaryCount > 0 && cloudinaryCount < cloudinaryValues.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CLOUDINARY_CLOUD_NAME"],
        message:
          "CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET must be provided together",
      });
    }

    if (value.NODE_ENV === "production") {
      for (const key of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"] as const) {
        if (!value[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} is required in production`,
          });
        }
      }

      if (!value.MONGO_URI) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["MONGO_URI"],
          message: "MONGO_URI is required in production",
        });
      } else if (/localhost|127\.0\.0\.1|0\.0\.0\.0|::1/i.test(value.MONGO_URI)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["MONGO_URI"],
          message: "MONGO_URI must not point to localhost in production",
        });
      }

      const origins = value.CORS_ORIGIN.split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);
      const invalidOrigin =
        origins.length === 0 ||
        origins.some(
          (origin) =>
            origin === "*" ||
            !origin.startsWith("https://") ||
            /localhost|127\.0\.0\.1/i.test(origin),
        );
      if (invalidOrigin) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["CORS_ORIGIN"],
          message:
            "CORS_ORIGIN must be an explicit https origin (no wildcard, no localhost) in production",
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n");
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === "production";
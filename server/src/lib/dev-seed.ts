import { env } from "../config/env";
import { UserModel } from "../models/user.model";
import { hashPassword } from "../services/auth.service";
import { logger } from "./logger";

const DEV_ADMIN_EMAIL = "admin@haven.test";
const DEV_ADMIN_PASSWORD = "HavenAdmin123";

export async function seedDevAdmin(): Promise<void> {
  const demoDataEnabled = process.env.ENABLE_DEMO_DATA === "true";
  if (env.NODE_ENV !== "development" && !demoDataEnabled) return;

  if (demoDataEnabled) {
    const existingDemoAdmin = await UserModel.findOne({ email: DEV_ADMIN_EMAIL }).select("_id");
    if (existingDemoAdmin) return;

    await UserModel.create({
      name: process.env.ADMIN_NAME ?? "Haven Admin",
      email: DEV_ADMIN_EMAIL,
      passwordHash: await hashPassword(DEV_ADMIN_PASSWORD),
      role: "admin",
      status: "active",
    });

    logger.warn(
      {
        email: DEV_ADMIN_EMAIL,
        ...(env.NODE_ENV === "production" ? {} : { password: DEV_ADMIN_PASSWORD }),
      },
      "Seeded demo admin account",
    );
    return;
  }

  const email = (process.env.ADMIN_EMAIL ?? DEV_ADMIN_EMAIL).toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD ?? DEV_ADMIN_PASSWORD;

  const existing = await UserModel.findOne({ role: "admin" }).select("_id");

  if (existing) return;

  await UserModel.create({
    name: process.env.ADMIN_NAME ?? "Haven Admin",
    email,
    passwordHash: await hashPassword(password),
    role: "admin",
    status: "active",
  });

  logger.warn({ email, password }, "Seeded development admin account");
}
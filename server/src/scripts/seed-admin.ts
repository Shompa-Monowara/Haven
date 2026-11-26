import { disconnectDatabase, initializeDatabase } from "../config/db";
import { UserModel } from "../models/user.model";
import { hashPassword } from "../services/auth.service";

const email = (process.env.ADMIN_EMAIL ?? "admin@haven.test").toLowerCase().trim();
const password = process.env.ADMIN_PASSWORD ?? "HavenAdmin123";
const name = process.env.ADMIN_NAME ?? "Haven Admin";

async function seedAdmin(): Promise<void> {
  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters");
  }

  await initializeDatabase();

  const passwordHash = await hashPassword(password);
  const existing = await UserModel.findOne({ email });

  if (existing) {
    existing.name = name;
    existing.role = "admin";
    existing.status = "active";
    existing.passwordHash = passwordHash;
    await existing.save();
    console.log(`Updated admin account: ${email}`);
  } else {
    await UserModel.create({
      name,
      email,
      passwordHash,
      role: "admin",
      status: "active",
    });
    console.log(`Created admin account: ${email}`);
  }

  console.log(`Sign in with ${email} / ${password}`);
  await disconnectDatabase();
}

void seedAdmin().catch((error) => {
  console.error(error);
  process.exit(1);
});
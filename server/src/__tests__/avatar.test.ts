import { existsSync } from "node:fs";
import path from "node:path";

import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../app";
import { connectDatabase, disconnectDatabase } from "../config/db";
import { UPLOAD_ROOT } from "../routes/upload.routes";
import { resetDatabase } from "./helpers";

let memoryServer: MongoMemoryServer;

const buyerInput = {
  name: "Priya Shah",
  email: "priya@example.com",
  password: "HavenBuyer123",
  role: "buyer" as const,
  consent: true,
};

async function register(app: ReturnType<typeof createApp>) {
  const response = await request(app).post("/api/auth/register").send(buyerInput);
  expect(response.status).toBe(201);
  return {
    token: response.body.data.accessToken as string,
    user: response.body.data.user as { id: string },
  };
}

async function portrait(size = 320): Promise<Buffer> {
  return sharp({
    create: { width: size, height: size, channels: 3, background: "#4b8fbe" },
  })
    .png()
    .toBuffer();
}

function absolutePath(url: string) {
  return path.join(UPLOAD_ROOT, url.replace("/uploads/", ""));
}

beforeAll(async () => {
  memoryServer = await MongoMemoryServer.create();
  await connectDatabase(memoryServer.getUri());
}, 300_000);

afterAll(async () => {
  await disconnectDatabase();
  await memoryServer?.stop();
});

beforeEach(async () => {
  await resetDatabase();
});

describe("avatar uploads", () => {
  it("uploads, processes, replaces, and removes a profile photo", async () => {
    const app = createApp();
    const { token, user } = await register(app);
    const auth = `Bearer ${token}`;

    const first = await request(app)
      .post("/api/uploads/avatar")
      .set("Authorization", auth)
      .attach("file", await portrait(), { filename: "me.png", contentType: "image/png" });

    expect(first.status).toBe(201);
    const firstUrl = first.body.data.user.avatar.url as string;
    expect(firstUrl).toMatch(new RegExp(`^/uploads/avatars/${user.id}/.+\\.webp$`));
    expect(existsSync(absolutePath(firstUrl))).toBe(true);

    const served = await request(app).get(firstUrl);
    expect(served.status).toBe(200);
    expect(served.headers["content-type"]).toContain("image/webp");

    // Replacing deletes the previous file.
    const second = await request(app)
      .post("/api/uploads/avatar")
      .set("Authorization", auth)
      .attach("file", await portrait(400), { filename: "me-2.png", contentType: "image/png" });

    expect(second.status).toBe(201);
    const secondUrl = second.body.data.user.avatar.url as string;
    expect(secondUrl).not.toBe(firstUrl);
    expect(existsSync(absolutePath(firstUrl))).toBe(false);
    expect(existsSync(absolutePath(secondUrl))).toBe(true);

    // Removing clears the avatar and the file.
    const removed = await request(app).delete("/api/uploads/avatar").set("Authorization", auth);
    expect(removed.status).toBe(200);
    expect(removed.body.data.user.avatar).toBeNull();
    expect(existsSync(absolutePath(secondUrl))).toBe(false);
  }, 30_000);

  it("rejects wrong types, tiny images, oversized files, and guests", async () => {
    const app = createApp();
    const { token } = await register(app);
    const auth = `Bearer ${token}`;

    const wrongType = await request(app)
      .post("/api/uploads/avatar")
      .set("Authorization", auth)
      .attach("file", Buffer.from("not an image"), {
        filename: "notes.txt",
        contentType: "text/plain",
      });
    expect(wrongType.status).toBe(400);

    const tooSmall = await request(app)
      .post("/api/uploads/avatar")
      .set("Authorization", auth)
      .attach("file", await portrait(120), { filename: "tiny.png", contentType: "image/png" });
    expect(tooSmall.status).toBe(400);
    expect(tooSmall.body.error.message).toContain("too small");

    const oversized = await request(app)
      .post("/api/uploads/avatar")
      .set("Authorization", auth)
      .attach("file", Buffer.alloc(6 * 1024 * 1024, 1), {
        filename: "huge.png",
        contentType: "image/png",
      });
    expect(oversized.status).toBe(400);
    expect(oversized.body.error.code).toBe("UPLOAD_ERROR");

    const guest = await request(app)
      .post("/api/uploads/avatar")
      .attach("file", await portrait(), { filename: "me.png", contentType: "image/png" });
    expect(guest.status).toBe(401);
  }, 30_000);
});
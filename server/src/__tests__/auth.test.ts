import express from "express";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

import { resetDatabase } from "./helpers";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../app";
import { connectDatabase, disconnectDatabase } from "../config/db";
import { errorHandler } from "../middleware/error";
import { requireAuth, requireRole } from "../middleware/auth";
import { UserModel } from "../models/user.model";

const { sendPasswordResetEmailMock } = vi.hoisted(() => ({
  sendPasswordResetEmailMock: vi.fn(),
}));

vi.mock("../lib/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/email")>();
  return { ...actual, sendPasswordResetEmail: sendPasswordResetEmailMock };
});

let memoryServer: MongoMemoryServer;

const buyer = {
  name: "Avery Brooks",
  email: "avery@example.com",
  phone: "+1 555 0100",
  password: "Haven1234",
  role: "buyer" as const,
  consent: true,
};

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

beforeEach(() => {
  sendPasswordResetEmailMock.mockReset();
  sendPasswordResetEmailMock.mockResolvedValue(undefined);
});

describe("POST /api/auth/register", () => {
  it("creates a buyer and starts a session", async () => {
    const response = await request(createApp()).post("/api/auth/register").send(buyer);

    expect(response.status).toBe(201);
    expect(response.body.data.user).toMatchObject({
      name: buyer.name,
      email: buyer.email,
      role: "buyer",
      status: "active",
    });
    expect(response.body.data.accessToken).toEqual(expect.any(String));
    expect(response.body.data.agentProfile).toBeNull();
    expect(response.headers["set-cookie"]?.join(";")).toContain("haven_refresh=");
    expect(response.body.data.user).not.toHaveProperty("passwordHash");
  });

  it("creates an agent profile for agent accounts", async () => {
    const response = await request(createApp())
      .post("/api/auth/register")
      .send({
        ...buyer,
        email: "maya@example.com",
        role: "agent",
        agency: "Harbor Realty",
        licenseNumber: "NY-12345",
      });

    expect(response.status).toBe(201);
    expect(response.body.data.agentProfile).toMatchObject({
      agency: "Harbor Realty",
      licenseNumber: "NY-12345",
      verified: false,
    });
  });

  it("rejects weak passwords and missing consent", async () => {
    const weak = await request(createApp())
      .post("/api/auth/register")
      .send({ ...buyer, password: "short" });

    expect(weak.status).toBe(400);
    expect(weak.body.error.code).toBe("VALIDATION_ERROR");

    const noConsent = await request(createApp())
      .post("/api/auth/register")
      .send({ ...buyer, email: "other@example.com", consent: false });

    expect(noConsent.status).toBe(400);
  });

  it("rejects duplicate emails with a conflict", async () => {
    const app = createApp();
    await request(app).post("/api/auth/register").send(buyer);
    const response = await request(app).post("/api/auth/register").send(buyer);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CONFLICT");
  });

  it("requires an agency for agent registration", async () => {
    const response = await request(createApp())
      .post("/api/auth/register")
      .send({ ...buyer, role: "agent" });

    expect(response.status).toBe(400);
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "agency" })]),
    );
  });
});

describe("login, session refresh, and logout", () => {
  it("signs in, returns the current user, and rotates the refresh token", async () => {
    const app = createApp();
    await request(app).post("/api/auth/register").send(buyer);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: buyer.email, password: buyer.password });

    expect(login.status).toBe(200);

    const token = login.body.data.accessToken as string;
    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);

    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe(buyer.email);

    const cookie = login.headers["set-cookie"]?.[0]?.split(";")[0];
    expect(cookie).toBeTruthy();

    const refreshed = await request(app).post("/api/auth/refresh").set("Cookie", cookie as string);
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.accessToken).toEqual(expect.any(String));

    const replay = await request(app).post("/api/auth/refresh").set("Cookie", cookie as string);
    expect(replay.status).toBe(401);
  });

  it("rejects invalid credentials", async () => {
    const app = createApp();
    await request(app).post("/api/auth/register").send(buyer);

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: buyer.email, password: "WrongPass123" });

    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe("Email or password is incorrect");
  });

  it("revokes the session on logout", async () => {
    const app = createApp();
    const agent = request.agent(app);

    await agent.post("/api/auth/register").send(buyer);
    const logout = await agent.post("/api/auth/logout");
    expect(logout.status).toBe(204);

    const refreshed = await agent.post("/api/auth/refresh");
    // With no refresh cookie left after logout, the endpoint confirms there is no session.
    expect(refreshed.status).toBe(204);
  });
});

describe("password reset", () => {
  it("issues a reset token in the test environment and updates the password", async () => {
    const app = createApp();
    await request(app).post("/api/auth/register").send(buyer);

    const forgot = await request(app).post("/api/auth/forgot-password").send({ email: buyer.email });
    expect(forgot.status).toBe(200);
    expect(forgot.body.data.resetToken).toEqual(expect.any(String));

    const reset = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: forgot.body.data.resetToken, password: "NewHaven123" });

    expect(reset.status).toBe(200);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: buyer.email, password: "NewHaven123" });

    expect(login.status).toBe(200);
  });

  it("returns the same message for unknown emails and only emails known accounts", async () => {
    const app = createApp();
    await request(app).post("/api/auth/register").send(buyer);

    const known = await request(app).post("/api/auth/forgot-password").send({ email: buyer.email });
    const unknown = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "unknown@example.com" });

    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(known.body.data.message).toBe(unknown.body.data.message);
    expect(known.body.data.message).toBe(
      "If an account exists for that email, a reset link is on its way.",
    );
    expect(unknown.body.data.resetToken).toBeUndefined();

    expect(sendPasswordResetEmailMock).toHaveBeenCalledTimes(1);
    expect(sendPasswordResetEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: buyer.email,
        name: buyer.name,
        expiresInMinutes: 30,
        resetUrl: expect.stringContaining("token="),
      }),
    );
  });
});

describe("role guards", () => {
  function createGuardedApp() {
    const app = express();
    app.get("/admin-only", requireAuth, requireRole("admin"), (_req, res) => {
      res.json({ data: { ok: true } });
    });
    app.use(errorHandler);
    return app;
  }

  it("rejects guests and users without the required role", async () => {
    const app = createGuardedApp();
    const register = await request(createApp()).post("/api/auth/register").send(buyer);
    const token = register.body.data.accessToken as string;

    const guest = await request(app).get("/admin-only");
    expect(guest.status).toBe(401);

    const buyerAttempt = await request(app)
      .get("/admin-only")
      .set("Authorization", `Bearer ${token}`);
    expect(buyerAttempt.status).toBe(403);
    expect(buyerAttempt.body.error.code).toBe("FORBIDDEN");
  });

  it("allows a user whose stored role matches", async () => {
    const app = createGuardedApp();
    const register = await request(createApp()).post("/api/auth/register").send(buyer);
    const token = register.body.data.accessToken as string;

    await UserModel.updateOne({ email: buyer.email }, { $set: { role: "admin" } });

    const response = await request(app)
      .get("/admin-only")
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(200);
  });
});

describe("account profile", () => {
  it("updates the signed-in user's profile", async () => {
    const app = createApp();
    const register = await request(app).post("/api/auth/register").send(buyer);
    const token = register.body.data.accessToken as string;

    const response = await request(app)
      .patch("/api/account/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Avery B.", phone: "+1 555 0199" });

    expect(response.status).toBe(200);
    expect(response.body.data.user).toMatchObject({ name: "Avery B.", phone: "+1 555 0199" });
  });

  it("rejects unauthenticated profile updates", async () => {
    const response = await request(createApp()).patch("/api/account/profile").send({ name: "No Auth" });
    expect(response.status).toBe(401);
  });
});
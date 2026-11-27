import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

import { resetDatabase } from "./helpers";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../app";
import { connectDatabase, disconnectDatabase } from "../config/db";
import { AuditLogModel } from "../models/audit-log.model";
import { NotificationModel } from "../models/notification.model";
import { PlatformSettingsModel } from "../models/platform-settings.model";
import { UserModel } from "../models/user.model";
import { hashPassword } from "../services/auth.service";
import { runSavedSearchDigests } from "../services/saved-search.service";
import { invalidatePlatformSettingsCache } from "../services/settings.service";

const {
  sendListingDecisionEmailMock,
  sendOfflineMessageEmailMock,
  sendSavedSearchDigestMock,
  sendPasswordResetEmailMock,
} = vi.hoisted(() => ({
  sendListingDecisionEmailMock: vi.fn(),
  sendOfflineMessageEmailMock: vi.fn(),
  sendSavedSearchDigestMock: vi.fn(),
  sendPasswordResetEmailMock: vi.fn(),
}));

vi.mock("../lib/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/email")>();
  return {
    ...actual,
    sendListingDecisionEmail: sendListingDecisionEmailMock,
    sendOfflineMessageEmail: sendOfflineMessageEmailMock,
    sendSavedSearchDigest: sendSavedSearchDigestMock,
    sendPasswordResetEmail: sendPasswordResetEmailMock,
  };
});

let memoryServer: MongoMemoryServer;

const agentInput = {
  name: "Maya Chen",
  email: "maya@example.com",
  password: "HavenAgent123",
  role: "agent" as const,
  agency: "Harbor Realty",
  licenseNumber: "NY-12345",
  consent: true,
};

const buyerInput = {
  name: "Priya Shah",
  email: "priya@example.com",
  password: "HavenBuyer123",
  role: "buyer" as const,
  consent: true,
};

const listingInput = (overrides: Record<string, unknown> = {}) => ({
  title: "Sunlit brownstone with a private garden",
  description:
    "A restored brownstone with original moldings, a chef's kitchen, and a deep garden that catches the afternoon sun.",
  listingType: "sale" as const,
  propertyType: "house" as const,
  price: 1_845_000,
  beds: 4,
  baths: 3,
  sizeSqft: 2860,
  address: {
    street: "148A Berkeley Place",
    city: "Brooklyn",
    state: "NY",
    zip: "11217",
    country: "United States",
  },
  location: { lat: 40.6795, lng: -73.978 },
  amenities: ["Garden"],
  images: [0, 1, 2].map((index) => ({
    url: `https://images.example.com/photo-${index}.jpg`,
    alt: `Photo ${index + 1}`,
    isCover: index === 0,
    order: index,
  })),
  ...overrides,
});

async function register(app: ReturnType<typeof createApp>, input: Record<string, unknown>) {
  const response = await request(app).post("/api/auth/register").send(input);
  expect(response.status).toBe(201);
  return {
    token: response.body.data.accessToken as string,
    user: response.body.data.user as { id: string; email: string },
  };
}

async function adminSession(app: ReturnType<typeof createApp>) {
  const admin = await UserModel.create({
    name: "Haven Admin",
    email: "admin@example.com",
    passwordHash: await hashPassword("HavenAdmin123"),
    role: "admin",
    status: "active",
  });
  const login = await request(app)
    .post("/api/auth/login")
    .send({ email: "admin@example.com", password: "HavenAdmin123" });
  return { token: login.body.data.accessToken as string, id: admin.id };
}

async function pendingListing(
  app: ReturnType<typeof createApp>,
  token: string,
  overrides: Record<string, unknown> = {},
) {
  const created = await request(app)
    .post("/api/properties")
    .set("Authorization", `Bearer ${token}`)
    .send(listingInput(overrides));
  expect(created.status).toBe(201);

  const submitted = await request(app)
    .post(`/api/properties/${created.body.data.id}/submit`)
    .set("Authorization", `Bearer ${token}`);
  expect(submitted.status).toBe(200);

  return created.body.data as { id: string; slug: string };
}

async function approve(app: ReturnType<typeof createApp>, adminToken: string, id: string) {
  const response = await request(app)
    .patch(`/api/admin/listings/${id}/status`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ status: "approved" });
  expect(response.status).toBe(200);
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
  invalidatePlatformSettingsCache();
});

beforeEach(() => {
  vi.clearAllMocks();
  sendListingDecisionEmailMock.mockResolvedValue(undefined);
  sendOfflineMessageEmailMock.mockResolvedValue(undefined);
  sendSavedSearchDigestMock.mockResolvedValue(undefined);
  sendPasswordResetEmailMock.mockResolvedValue(undefined);
});

describe("admin platform settings", () => {
  it("creates defaults on GET and exposes a secret-free status", async () => {
    const app = createApp();
    const admin = await adminSession(app);

    const response = await request(app)
      .get("/api/admin/settings")
      .set("Authorization", `Bearer ${admin.token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.settings.review.standardReviewBusinessDays).toBe(1);
    expect(response.body.data.settings.notifications).toEqual({
      listingDecisionEmails: true,
      offlineMessageEmails: true,
      savedSearchDigests: true,
    });
    expect(await PlatformSettingsModel.countDocuments({ key: "platform" })).toBe(1);

    const status = response.body.data.status;
    expect(typeof status.email.configured).toBe("boolean");
    expect(["cloudinary", "local"]).toContain(status.storage.provider);
    expect(["development", "test", "production"]).toContain(status.environment);

    const serialized = JSON.stringify(status);
    expect(serialized).not.toContain("@");
    expect(serialized).not.toMatch(/https?:/i);
    expect(serialized.toLowerCase()).not.toContain("smtp");
  });

  it("updates settings and writes exactly one before/after audit entry", async () => {
    const app = createApp();
    const admin = await adminSession(app);

    await request(app)
      .get("/api/admin/settings")
      .set("Authorization", `Bearer ${admin.token}`);

    const response = await request(app)
      .patch("/api/admin/settings")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        review: { standardReviewBusinessDays: 3 },
        notifications: { savedSearchDigests: false },
      });

    expect(response.status).toBe(200);
    expect(response.body.data.settings.review.standardReviewBusinessDays).toBe(3);
    expect(response.body.data.settings.notifications.savedSearchDigests).toBe(false);

    const logs = await AuditLogModel.find({ action: "settings.update" });
    expect(logs).toHaveLength(1);
    expect(logs[0].entity).toBe("PlatformSettings");
    expect(logs[0].entityId.toString()).toBe(response.body.data.settings.id);
    expect(logs[0].before).toEqual({
      review: { standardReviewBusinessDays: 1 },
      notifications: { savedSearchDigests: true },
    });
    expect(logs[0].after).toEqual({
      review: { standardReviewBusinessDays: 3 },
      notifications: { savedSearchDigests: false },
    });
  });

  it("requires an admin account", async () => {
    const app = createApp();
    const buyer = await register(app, buyerInput);

    const anonymousGet = await request(app).get("/api/admin/settings");
    expect(anonymousGet.status).toBe(401);
    const anonymousPatch = await request(app)
      .patch("/api/admin/settings")
      .send({ review: { standardReviewBusinessDays: 2 } });
    expect(anonymousPatch.status).toBe(401);

    const nonAdminGet = await request(app)
      .get("/api/admin/settings")
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(nonAdminGet.status).toBe(403);
    const nonAdminPatch = await request(app)
      .patch("/api/admin/settings")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ review: { standardReviewBusinessDays: 2 } });
    expect(nonAdminPatch.status).toBe(403);
  });

  it("rejects invalid payloads", async () => {
    const app = createApp();
    const admin = await adminSession(app);

    const patch = (body: unknown) =>
      request(app)
        .patch("/api/admin/settings")
        .set("Authorization", `Bearer ${admin.token}`)
        .send(body as Record<string, unknown>);

    expect((await patch({})).status).toBe(400);
    expect((await patch({ unknown: true })).status).toBe(400);
    expect((await patch({ review: { standardReviewBusinessDays: 11 } })).status).toBe(400);
    expect((await patch({ review: { standardReviewBusinessDays: 1.5 } })).status).toBe(400);
    expect((await patch({ notifications: { listingDecisionEmails: "yes" } })).status).toBe(400);
  });
});

describe("settings guards", () => {
  it("skips listing decision emails but keeps the in-app notification", async () => {
    const app = createApp();
    const agent = await register(app, agentInput);
    const admin = await adminSession(app);
    const listing = await pendingListing(app, agent.token);

    const disable = await request(app)
      .patch("/api/admin/settings")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ notifications: { listingDecisionEmails: false } });
    expect(disable.status).toBe(200);

    await approve(app, admin.token, listing.id);

    expect(sendListingDecisionEmailMock).not.toHaveBeenCalled();
    expect(
      await NotificationModel.countDocuments({
        user: agent.user.id,
        type: "listing_decision",
      }),
    ).toBe(1);
  }, 30_000);

  it("returns early from saved search digests when disabled", async () => {
    const app = createApp();
    const admin = await adminSession(app);

    const disable = await request(app)
      .patch("/api/admin/settings")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ notifications: { savedSearchDigests: false } });
    expect(disable.status).toBe(200);

    const result = await runSavedSearchDigests();
    expect(result).toEqual({ processed: 0, emailsSent: 0, totalMatches: 0 });
    expect(sendSavedSearchDigestMock).not.toHaveBeenCalled();
  }, 30_000);

  it("skips offline message emails but keeps the in-app notification", async () => {
    const app = createApp();
    const agent = await register(app, agentInput);
    const buyer = await register(app, buyerInput);
    const admin = await adminSession(app);
    const listing = await pendingListing(app, agent.token);
    await approve(app, admin.token, listing.id);

    const disable = await request(app)
      .patch("/api/admin/settings")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ notifications: { offlineMessageEmails: false } });
    expect(disable.status).toBe(200);

    const conversation = await request(app)
      .post("/api/conversations")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ propertyId: listing.id });
    expect(conversation.status).toBe(201);

    const sent = await request(app)
      .post(`/api/conversations/${conversation.body.data.id}/messages`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ body: "Is the garden shared or private?" });
    expect(sent.status).toBe(201);

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(sendOfflineMessageEmailMock).not.toHaveBeenCalled();
    expect(
      await NotificationModel.countDocuments({ user: agent.user.id, type: "message" }),
    ).toBe(1);
  }, 30_000);

  it("never disables transactional password reset emails", async () => {
    const app = createApp();
    const buyer = await register(app, buyerInput);
    const admin = await adminSession(app);

    const disable = await request(app)
      .patch("/api/admin/settings")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        notifications: {
          listingDecisionEmails: false,
          offlineMessageEmails: false,
          savedSearchDigests: false,
        },
      });
    expect(disable.status).toBe(200);

    const reset = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: buyer.user.email });
    expect(reset.status).toBe(200);
    expect(sendPasswordResetEmailMock).toHaveBeenCalledTimes(1);
  }, 30_000);
});
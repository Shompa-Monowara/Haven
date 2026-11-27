import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

import { resetDatabase } from "./helpers";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../app";
import { connectDatabase, disconnectDatabase } from "../config/db";
import { UserModel } from "../models/user.model";
import { hashPassword } from "../services/auth.service";

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

async function pendingListing(app: ReturnType<typeof createApp>, token: string, overrides = {}) {
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

describe("admin approval workflow", () => {
  it("shows KPIs, approves listings, publishes them immediately, and records audit entries", async () => {
    const app = createApp();
    const agent = await register(app, agentInput);
    const admin = await adminSession(app);
    const listing = await pendingListing(app, agent.token);

    const stats = await request(app)
      .get("/api/admin/stats")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(stats.status).toBe(200);
    expect(stats.body.data.kpis.pendingApprovals).toBe(1);
    expect(stats.body.data.pending[0].title).toContain("Sunlit");

    const detail = await request(app)
      .get(`/api/admin/listings/${listing.id}`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.agent.email).toBe("maya@example.com");
    expect(detail.body.data.audit.some((entry: { action: string }) => entry.action === "property.submitted")).toBe(true);

    const guestBefore = await request(app).get(`/api/properties/${listing.slug}`);
    expect(guestBefore.status).toBe(404);

    const approved = await request(app)
      .patch(`/api/admin/listings/${listing.id}/status`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "approved" });
    expect(approved.status).toBe(200);

    const guestAfter = await request(app).get(`/api/properties/${listing.slug}`);
    expect(guestAfter.status).toBe(200);

    const audit = await request(app)
      .get("/api/admin/audit?entity=Property")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(audit.status).toBe(200);
    expect(audit.body.data.some((entry: { action: string }) => entry.action === "property.approved")).toBe(true);
    expect(audit.body.data[0].actor.name).toBe("Haven Admin");

    const afterStats = await request(app)
      .get("/api/admin/stats")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(afterStats.body.data.kpis.pendingApprovals).toBe(0);
    expect(afterStats.body.data.kpis.liveListings).toBe(1);
  }, 30_000);

  it("bulk approves only pending listings and requires a reason to reject", async () => {
    const app = createApp();
    const agent = await register(app, agentInput);
    const admin = await adminSession(app);
    const first = await pendingListing(app, agent.token);
    const second = await pendingListing(app, agent.token, {
      title: "Corner loft with skyline windows",
      slug: undefined,
    });

    const bulk = await request(app)
      .post("/api/admin/listings/bulk-approve")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ ids: [first.id, second.id] });
    expect(bulk.status).toBe(200);
    expect(bulk.body.data.approved).toBe(2);

    const third = await pendingListing(app, agent.token, {
      title: "Garden villa with a shaded courtyard",
    });

    const missingReason = await request(app)
      .patch(`/api/admin/listings/${third.id}/status`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "rejected" });
    expect(missingReason.status).toBe(400);

    const rejected = await request(app)
      .patch(`/api/admin/listings/${third.id}/status`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "rejected", reasonCategory: "poor_photos", note: "Add daylight photos." });

    expect(rejected.status).toBe(200);
    expect(rejected.body.data.rejectionReason).toMatchObject({
      category: "poor_photos",
      note: "Add daylight photos.",
    });
  }, 30_000);

  it("archives and restores listings with audit coverage", async () => {
    const app = createApp();
    const agent = await register(app, agentInput);
    const admin = await adminSession(app);
    const listing = await pendingListing(app, agent.token);
    await request(app)
      .patch(`/api/admin/listings/${listing.id}/status`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "approved" });

    const archived = await request(app)
      .post(`/api/admin/listings/${listing.id}/archive`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(archived.status).toBe(200);
    expect(archived.body.data.status).toBe("archived");

    const hidden = await request(app).get(`/api/properties/${listing.slug}`);
    expect(hidden.status).toBe(200);
    expect(hidden.body.data.status).toBe("archived");

    const restored = await request(app)
      .post(`/api/admin/listings/${listing.id}/restore`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(restored.status).toBe(200);
    expect(restored.body.data.status).toBe("approved");
  }, 30_000);

  it("supports the full changes-requested → resubmit → approve loop", async () => {
    const app = createApp();
    const agent = await register(app, agentInput);
    const admin = await adminSession(app);
    const listing = await pendingListing(app, agent.token);

    const changes = await request(app)
      .patch(`/api/admin/listings/${listing.id}/status`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "changes_requested", reasonCategory: "poor_photos", note: "Add daylight photos." });
    expect(changes.status).toBe(200);
    expect(changes.body.data.status).toBe("changes_requested");

    const hidden = await request(app).get(`/api/properties/${listing.slug}`);
    expect(hidden.status).toBe(404);

    const queue = await request(app)
      .get("/api/admin/listings?status=changes_requested")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(queue.body.data.some((item: { id: string }) => item.id === listing.id)).toBe(true);

    const edited = await request(app)
      .patch(`/api/properties/${listing.id}`)
      .set("Authorization", `Bearer ${agent.token}`)
      .send({ description: `${listingInput().description} Updated with daylight photos.` });
    expect(edited.status).toBe(200);

    const resubmitted = await request(app)
      .post(`/api/properties/${listing.id}/submit`)
      .set("Authorization", `Bearer ${agent.token}`);
    expect(resubmitted.status).toBe(200);
    expect(resubmitted.body.data.status).toBe("pending");

    const approved = await request(app)
      .patch(`/api/admin/listings/${listing.id}/status`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "approved" });
    expect(approved.body.data.status).toBe("approved");

    const publicDetail = await request(app).get(`/api/properties/${listing.slug}`);
    expect(publicDetail.status).toBe(200);

    const audit = await request(app)
      .get("/api/admin/audit?entity=Property")
      .set("Authorization", `Bearer ${admin.token}`);
    const actions = audit.body.data.map((entry: { action: string }) => entry.action);
    expect(actions).toEqual(
      expect.arrayContaining([
        "property.changes_requested",
        "property.updated",
        "property.approved",
      ]),
    );
  }, 30_000);

  it("bulk approval ignores ids that are not pending and lets admins triage inquiries", async () => {
    const app = createApp();
    const agent = await register(app, agentInput);
    const buyer = await register(app, {
      name: "Priya Shah",
      email: "priya@example.com",
      password: "HavenBuyer123",
      role: "buyer",
      consent: true,
    });
    const admin = await adminSession(app);
    const first = await pendingListing(app, agent.token);
    const second = await pendingListing(app, agent.token, {
      title: "Corner loft with skyline windows",
    });

    const approvedFirst = await request(app)
      .patch(`/api/admin/listings/${first.id}/status`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "approved" });
    expect(approvedFirst.status).toBe(200);

    const bulk = await request(app)
      .post("/api/admin/listings/bulk-approve")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ ids: [first.id, second.id] });
    expect(bulk.body.data.approved).toBe(1);

    const inquiry = await request(app)
      .post("/api/inquiries")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        propertyId: second.id,
        name: "Priya Shah",
        email: "priya@example.com",
        message: "Is parking included with this loft?",
        consent: true,
      });
    expect(inquiry.status).toBe(201);

    const adminInbox = await request(app)
      .get("/api/inquiries")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(
      adminInbox.body.data.some((item: { id: string }) => item.id === inquiry.body.data.id),
    ).toBe(true);

    const triaged = await request(app)
      .patch(`/api/inquiries/${inquiry.body.data.id}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "qualified", note: "Parking is included." });
    expect(triaged.status).toBe(200);
    expect(triaged.body.data.status).toBe("qualified");
  }, 30_000);
});

describe("admin dashboard activity trend", () => {
  it("returns a zero-filled 30-day trend with today's listings and users", async () => {
    const app = createApp();
    const agent = await register(app, agentInput);
    await register(app, {
      name: "Priya Shah",
      email: "priya@example.com",
      password: "HavenBuyer123",
      role: "buyer",
      consent: true,
    });
    const admin = await adminSession(app);
    await pendingListing(app, agent.token);

    const response = await request(app)
      .get("/api/admin/stats")
      .set("Authorization", `Bearer ${admin.token}`);

    expect(response.status).toBe(200);
    const trend = response.body.data.activityTrend as Array<{
      date: string;
      listings: number;
      users: number;
    }>;

    expect(trend).toHaveLength(30);
    expect(trend[29]!.date).toBe(new Date().toISOString().slice(0, 10));
    expect(trend[29]!.listings).toBeGreaterThanOrEqual(1);
    expect(trend[29]!.users).toBeGreaterThanOrEqual(3);
    expect(trend.slice(0, 29).every((point) => point.listings === 0 && point.users === 0)).toBe(true);
  }, 30_000);
});

describe("admin user management", () => {
  it("suspends agents, hides their listings, blocks auth, and restores visibility", async () => {
    const app = createApp();
    const agent = await register(app, agentInput);
    const admin = await adminSession(app);
    const listing = await pendingListing(app, agent.token);
    await request(app)
      .patch(`/api/admin/listings/${listing.id}/status`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "approved" });

    const users = await request(app)
      .get("/api/admin/users?role=agent")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(users.status).toBe(200);
    expect(users.body.data[0].listingCount).toBe(1);
    expect(users.body.data[0].liveListingCount).toBe(1);

    const selfSuspend = await request(app)
      .patch(`/api/admin/users/${admin.id}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "suspended", reason: "Testing self suspension" });
    expect(selfSuspend.status).toBe(400);

    const missingReason = await request(app)
      .patch(`/api/admin/users/${agent.user.id}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "suspended" });
    expect(missingReason.status).toBe(400);

    const suspended = await request(app)
      .patch(`/api/admin/users/${agent.user.id}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "suspended", reason: "Repeated policy violations" });
    expect(suspended.status).toBe(200);
    expect(suspended.body.data.status).toBe("suspended");

    const agentBlocked = await request(app)
      .get("/api/properties/mine")
      .set("Authorization", `Bearer ${agent.token}`);
    expect(agentBlocked.status).toBe(403);

    const publicHidden = await request(app).get("/api/properties");
    expect(publicHidden.body.data).toHaveLength(0);

    const detailHidden = await request(app).get(`/api/properties/${listing.slug}`);
    expect(detailHidden.status).toBe(404);

    const reactivated = await request(app)
      .patch(`/api/admin/users/${agent.user.id}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "active" });
    expect(reactivated.body.data.status).toBe("active");

    const visibleAgain = await request(app).get("/api/properties");
    expect(visibleAgain.body.data).toHaveLength(1);
  }, 30_000);

  it("toggles agent verification and records the audit note", async () => {
    const app = createApp();
    const agent = await register(app, agentInput);
    const admin = await adminSession(app);

    const verified = await request(app)
      .patch(`/api/admin/users/${agent.user.id}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ verified: true });
    expect(verified.status).toBe(200);
    expect(verified.body.data.verified).toBe(true);

    const audit = await request(app)
      .get("/api/admin/audit")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(audit.body.data.some((entry: { action: string }) => entry.action === "agent.verified")).toBe(true);
  }, 30_000);
});
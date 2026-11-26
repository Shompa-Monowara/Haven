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

const buyerInput = {
  name: "Priya Shah",
  email: "priya@example.com",
  password: "HavenBuyer123",
  role: "buyer" as const,
  consent: true,
};

const listing = {
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
};

async function register(app: ReturnType<typeof createApp>, input: Record<string, unknown>) {
  const response = await request(app).post("/api/auth/register").send(input);
  expect(response.status).toBe(201);
  return {
    token: response.body.data.accessToken as string,
    user: response.body.data.user as { id: string },
  };
}

async function adminSession(app: ReturnType<typeof createApp>) {
  await UserModel.create({
    name: "Haven Admin",
    email: "admin@example.com",
    passwordHash: await hashPassword("HavenAdmin123"),
    role: "admin",
    status: "active",
  });
  const login = await request(app)
    .post("/api/auth/login")
    .send({ email: "admin@example.com", password: "HavenAdmin123" });
  return login.body.data.accessToken as string;
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

describe("notifications", () => {
  it("notifies admins of submissions and agents of decisions, inquiries, and messages", async () => {
    const app = createApp();
    const agent = await register(app, agentInput);
    const buyer = await register(app, buyerInput);
    const adminToken = await adminSession(app);

    const created = await request(app)
      .post("/api/properties")
      .set("Authorization", `Bearer ${agent.token}`)
      .send(listing);
    expect(created.status).toBe(201);

    const submitted = await request(app)
      .post(`/api/properties/${created.body.data.id}/submit`)
      .set("Authorization", `Bearer ${agent.token}`);
    expect(submitted.status).toBe(200);

    const adminNotifications = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(adminNotifications.status).toBe(200);
    expect(
      adminNotifications.body.data.items.some(
        (item: { title: string; href: string }) =>
          item.title === "Listing submitted for review" && item.href === "/admin/approvals",
      ),
    ).toBe(true);

    const approved = await request(app)
      .patch(`/api/admin/listings/${created.body.data.id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "approved" });
    expect(approved.status).toBe(200);

    const agentAfterApproval = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${agent.token}`);
    expect(
      agentAfterApproval.body.data.items.some(
        (item: { type: string }) => item.type === "listing_decision",
      ),
    ).toBe(true);

    const inquiry = await request(app)
      .post("/api/inquiries")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        propertyId: created.body.data.id,
        name: "Priya Shah",
        email: "priya@example.com",
        message: "Could we tour this Saturday morning?",
        consent: true,
      });
    expect(inquiry.status).toBe(201);

    const conversation = await request(app)
      .post("/api/conversations")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ propertyId: created.body.data.id });
    expect(conversation.status).toBe(201);

    const message = await request(app)
      .post(`/api/conversations/${conversation.body.data.id}/messages`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ body: "Is the garden private?" });
    expect(message.status).toBe(201);

    const agentNotifications = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${agent.token}`);
    const types = agentNotifications.body.data.items.map((item: { type: string }) => item.type);
    expect(types).toEqual(expect.arrayContaining(["listing_decision", "inquiry", "message"]));

    const unread = await request(app)
      .get("/api/notifications/unread-count")
      .set("Authorization", `Bearer ${agent.token}`);
    expect(unread.body.data.count).toBeGreaterThanOrEqual(3);

    const firstId = agentNotifications.body.data.items[0].id as string;
    const marked = await request(app)
      .post(`/api/notifications/${firstId}/read`)
      .set("Authorization", `Bearer ${agent.token}`);
    expect(marked.status).toBe(200);

    // A different user cannot clear another user's notification.
    const secondId = agentNotifications.body.data.items[1].id as string;
    await request(app)
      .post(`/api/notifications/${secondId}/read`)
      .set("Authorization", `Bearer ${buyer.token}`);

    const stillUnread = await request(app)
      .get("/api/notifications/unread-count")
      .set("Authorization", `Bearer ${agent.token}`);
    expect(stillUnread.body.data.count).toBeGreaterThanOrEqual(2);

    await request(app)
      .post("/api/notifications/read-all")
      .set("Authorization", `Bearer ${agent.token}`);

    const cleared = await request(app)
      .get("/api/notifications/unread-count")
      .set("Authorization", `Bearer ${agent.token}`);
    expect(cleared.body.data.count).toBe(0);

    const guest = await request(app).get("/api/notifications");
    expect(guest.status).toBe(401);
  }, 30_000);
});
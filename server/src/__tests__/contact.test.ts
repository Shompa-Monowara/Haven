import express from "express";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

import { resetDatabase } from "./helpers";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../app";
import { connectDatabase, disconnectDatabase } from "../config/db";
import { keyedRateLimit } from "../middleware/rate-limit";
import { AgentProfileModel } from "../models/agent-profile.model";
import { InquiryModel } from "../models/inquiry.model";
import { NotificationModel } from "../models/notification.model";
import { UserModel } from "../models/user.model";
import { hashPassword } from "../services/auth.service";

let memoryServer: MongoMemoryServer;

const agentInput = {
  name: "Amara Okafor",
  email: "amara@example.com",
  password: "HavenAgent123",
  role: "agent" as const,
  agency: "Skyline Partners",
  licenseNumber: "WA-30999",
  consent: true,
};

const buyerInput = {
  name: "Priya Shah",
  email: "priya@example.com",
  password: "HavenBuyer123",
  role: "buyer" as const,
  consent: true,
};

const listingInput = {
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
    neighborhood: "Park Slope",
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

function contactPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: "Jordan Lee",
    email: "jordan@example.com",
    topic: "buying",
    contactMethod: "email",
    message:
      "We are relocating in the spring and would love help finding a three-bedroom home near good schools.",
    consent: true,
    ...overrides,
  };
}

async function register(app: ReturnType<typeof createApp>, input: Record<string, unknown>) {
  const response = await request(app).post("/api/auth/register").send(input);
  expect(response.status).toBe(201);
  return {
    token: response.body.data.accessToken as string,
    user: response.body.data.user as { id: string; email: string },
  };
}

async function login(app: ReturnType<typeof createApp>, email: string, password: string) {
  const response = await request(app).post("/api/auth/login").send({ email, password });
  expect(response.status).toBe(200);
  return response.body.data.accessToken as string;
}

async function verifyAgent(userId: string) {
  await AgentProfileModel.updateOne({ user: userId }, { $set: { verified: true } });
}

async function adminToken(app: ReturnType<typeof createApp>) {
  await UserModel.create({
    name: "Haven Admin",
    email: "admin@example.com",
    passwordHash: await hashPassword("HavenAdmin123"),
    role: "admin",
    status: "active",
  });
  return login(app, "admin@example.com", "HavenAdmin123");
}

async function approvedListing(app: ReturnType<typeof createApp>, agentToken: string) {
  const created = await request(app)
    .post("/api/properties")
    .set("Authorization", `Bearer ${agentToken}`)
    .send(listingInput);
  expect(created.status).toBe(201);

  await request(app)
    .post(`/api/properties/${created.body.data.id}/submit`)
    .set("Authorization", `Bearer ${agentToken}`);

  const admin = await adminToken(app);
  const approved = await request(app)
    .patch(`/api/admin/listings/${created.body.data.id}/status`)
    .set("Authorization", `Bearer ${admin}`)
    .send({ status: "approved" });
  expect(approved.status).toBe(200);

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

describe("POST /api/agents/:id/contact", () => {
  it("accepts a guest enquiry, notifies the agent, and lists it with the topic", async () => {
    const app = createApp();
    const agent = await register(app, agentInput);
    await verifyAgent(agent.user.id);

    const response = await request(app)
      .post(`/api/agents/${agent.user.id}/contact`)
      .send(contactPayload());

    expect(response.status).toBe(201);
    expect(response.body.data.id).toBeTruthy();
    expect(response.body.data.status).toBe("new");
    expect(typeof response.body.data.responseTimeMinutes).toBe("number");

    const inquiry = await InquiryModel.findOne({ agent: agent.user.id });
    expect(inquiry).toBeTruthy();
    expect(inquiry?.source).toBe("agent_profile");
    expect(inquiry?.topic).toBe("buying");
    expect(inquiry?.property).toBeFalsy();
    expect(inquiry?.buyer).toBeFalsy();

    const notifications = await NotificationModel.find({ user: agent.user.id, type: "inquiry" });
    expect(notifications).toHaveLength(1);
    expect(notifications[0]!.title).toContain("Jordan Lee");

    const agentSession = await login(app, agentInput.email, agentInput.password);
    const leads = await request(app)
      .get("/api/inquiries")
      .set("Authorization", `Bearer ${agentSession}`);

    expect(leads.status).toBe(200);
    const lead = (leads.body.data as Array<Record<string, unknown>>).find(
      (item) => item.id === response.body.data.id,
    ) as Record<string, unknown> | undefined;

    expect(lead).toBeTruthy();
    expect(lead?.topic).toBe("buying");
    expect(lead?.property).toBeNull();
    expect(lead?.buyer).toMatchObject({
      id: null,
      name: "Jordan Lee",
      email: "jordan@example.com",
    });
  }, 30_000);

  it("attaches a logged-in buyer and blocks an agent contacting themselves", async () => {
    const app = createApp();
    const agent = await register(app, agentInput);
    await verifyAgent(agent.user.id);
    const buyer = await register(app, buyerInput);

    const response = await request(app)
      .post(`/api/agents/${agent.user.id}/contact`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send(contactPayload({ name: buyerInput.name, email: buyerInput.email }));

    expect(response.status).toBe(201);

    const inquiry = await InquiryModel.findOne({ agent: agent.user.id });
    expect(inquiry?.buyer?.toString()).toBe(buyer.user.id);

    const buyerLeads = await request(app)
      .get("/api/inquiries")
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(buyerLeads.status).toBe(200);
    expect(buyerLeads.body.data).toHaveLength(1);
    expect(buyerLeads.body.data[0].buyer.id).toBe(buyer.user.id);

    const self = await request(app)
      .post(`/api/agents/${agent.user.id}/contact`)
      .set("Authorization", `Bearer ${agent.token}`)
      .send(contactPayload({ email: agentInput.email }));
    expect(self.status).toBe(400);
    expect(self.body.error.code).toBe("BAD_REQUEST");
  }, 30_000);

  it("rejects invalid input with field-level details", async () => {
    const app = createApp();
    const agent = await register(app, agentInput);
    await verifyAgent(agent.user.id);
    const url = `/api/agents/${agent.user.id}/contact`;

    const shortMessage = await request(app).post(url).send(contactPayload({ message: "too short" }));
    expect(shortMessage.status).toBe(400);
    expect(shortMessage.body.error.code).toBe("VALIDATION_ERROR");
    expect(shortMessage.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "message" })]),
    );

    const noConsent = await request(app).post(url).send(contactPayload({ consent: false }));
    expect(noConsent.status).toBe(400);

    const noPhone = await request(app)
      .post(url)
      .send(contactPayload({ contactMethod: "phone", phone: "" }));
    expect(noPhone.status).toBe(400);
    expect(noPhone.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "phone" })]),
    );

    const badPhone = await request(app).post(url).send(contactPayload({ phone: "call me" }));
    expect(badPhone.status).toBe(400);

    expect(await InquiryModel.countDocuments()).toBe(0);
  }, 30_000);

  it("silently accepts a tripped honeypot without creating an enquiry", async () => {
    const app = createApp();
    const agent = await register(app, agentInput);
    await verifyAgent(agent.user.id);

    const response = await request(app)
      .post(`/api/agents/${agent.user.id}/contact`)
      .send(contactPayload({ website: "http://spam.example.com" }));

    expect(response.status).toBe(201);
    expect(await InquiryModel.countDocuments()).toBe(0);
    expect(await NotificationModel.countDocuments()).toBe(0);
  }, 30_000);

  it("returns not found for unknown, unverified, and suspended agents", async () => {
    const app = createApp();
    const agent = await register(app, agentInput);
    await verifyAgent(agent.user.id);

    const unknown = await request(app)
      .post(`/api/agents/${new mongoose.Types.ObjectId().toString()}/contact`)
      .send(contactPayload());
    expect(unknown.status).toBe(404);

    const malformed = await request(app).post("/api/agents/not-an-id/contact").send(contactPayload());
    expect(malformed.status).toBe(404);

    const unverified = await register(app, {
      ...agentInput,
      name: "Lucas Meyer",
      email: "lucas@example.com",
    });
    const blocked = await request(app)
      .post(`/api/agents/${unverified.user.id}/contact`)
      .send(contactPayload());
    expect(blocked.status).toBe(404);

    await UserModel.updateOne({ _id: agent.user.id }, { $set: { status: "suspended" } });
    const suspended = await request(app)
      .post(`/api/agents/${agent.user.id}/contact`)
      .send(contactPayload());
    expect(suspended.status).toBe(404);
  }, 30_000);

  it("requires the related listing to be an approved home owned by the agent", async () => {
    const app = createApp();
    const owner = await register(app, agentInput);
    await verifyAgent(owner.user.id);
    const other = await register(app, {
      ...agentInput,
      name: "Daniel Ortiz",
      email: "daniel@example.com",
    });
    await verifyAgent(other.user.id);

    const listing = await approvedListing(app, owner.token);

    const foreign = await request(app)
      .post(`/api/agents/${other.user.id}/contact`)
      .send(contactPayload({ propertyId: listing.id }));
    expect(foreign.status).toBe(400);

    const owned = await request(app)
      .post(`/api/agents/${owner.user.id}/contact`)
      .send(contactPayload({ propertyId: listing.id }));
    expect(owned.status).toBe(201);

    const inquiry = await InquiryModel.findOne({ agent: owner.user.id });
    expect(inquiry?.property?.toString()).toBe(listing.id);
  }, 30_000);

  it("enforces a per-caller rate limit", async () => {
    const limited = express();
    limited.use(express.json());
    limited.post(
      "/limited",
      keyedRateLimit({
        windowMs: 60_000,
        limit: 2,
        key: () => "fixed-caller",
        enforced: true,
        message: "Too many messages, try again in a few minutes",
      }),
      (_req, res) => res.status(201).json({ data: { ok: true } }),
    );

    await request(limited).post("/limited").send({});
    await request(limited).post("/limited").send({});
    const blocked = await request(limited).post("/limited").send({});

    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe("RATE_LIMITED");
    expect(blocked.body.error.message).toContain("Too many messages");
  }, 30_000);
});

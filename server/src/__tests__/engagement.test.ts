import { unlink } from "node:fs/promises";
import path from "node:path";

import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

import { pngWithDimensions, resetDatabase } from "./helpers";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../app";
import { connectDatabase, disconnectDatabase } from "../config/db";
import { PropertyModel } from "../models/property.model";
import { UserModel } from "../models/user.model";
import { UPLOAD_ROOT } from "../routes/upload.routes";
import { hashPassword } from "../services/auth.service";
import { notifyInstantMatches, runSavedSearchDigests } from "../services/saved-search.service";

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

async function register(app: ReturnType<typeof createApp>, input: Record<string, unknown>) {
  const response = await request(app).post("/api/auth/register").send(input);
  expect(response.status).toBe(201);
  return {
    token: response.body.data.accessToken as string,
    user: response.body.data.user as { id: string; email: string },
  };
}

async function adminToken(app: ReturnType<typeof createApp>) {
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

async function createPendingListing(app: ReturnType<typeof createApp>, token: string) {
  const created = await request(app)
    .post("/api/properties")
    .set("Authorization", `Bearer ${token}`)
    .send(listingInput);
  expect(created.status).toBe(201);

  const submitted = await request(app)
    .post(`/api/properties/${created.body.data.id}/submit`)
    .set("Authorization", `Bearer ${token}`);
  expect(submitted.status).toBe(200);

  return created.body.data as { id: string; slug: string };
}

async function approve(app: ReturnType<typeof createApp>, admin: string, id: string) {
  const response = await request(app)
    .patch(`/api/admin/listings/${id}/status`)
    .set("Authorization", `Bearer ${admin}`)
    .send({ status: "approved" });
  expect(response.status).toBe(200);
  return response.body.data;
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

describe("favorites", () => {
  it("adds and removes favorites idempotently and lists summaries", async () => {
    const app = createApp();
    const agent = await register(app, agentInput);
    const buyer = await register(app, buyerInput);
    const admin = await adminToken(app);
    const listing = await createPendingListing(app, agent.token);
    await approve(app, admin, listing.id);

    const guest = await request(app).post(`/api/favorites/${listing.id}`);
    expect(guest.status).toBe(401);

    const added = await request(app)
      .post(`/api/favorites/${listing.id}`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(added.status).toBe(201);
    expect(added.body.data.count).toBe(1);

    const again = await request(app)
      .post(`/api/favorites/${listing.id}`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(again.body.data.count).toBe(1);

    const list = await request(app)
      .get("/api/favorites")
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].title).toBe(listingInput.title);
    expect(list.body.data[0].agent.name).toBe("Maya Chen");

    const ids = await request(app)
      .get("/api/favorites/ids")
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(ids.body.data).toContain(listing.id);

    const removed = await request(app)
      .delete(`/api/favorites/${listing.id}`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(removed.body.data.count).toBe(0);

    const empty = await request(app)
      .get("/api/favorites")
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(empty.body.data).toHaveLength(0);

    const unapproved = await createPendingListing(app, agent.token);
    const notAvailable = await request(app)
      .post(`/api/favorites/${unapproved.id}`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(notAvailable.status).toBe(404);
  });
});

describe("saved searches and digests", () => {
  it("creates, updates, counts matches, and runs a digest", async () => {
    const app = createApp();
    const agent = await register(app, agentInput);
    const buyer = await register(app, buyerInput);
    const admin = await adminToken(app);
    const listing = await createPendingListing(app, agent.token);

    const created = await request(app)
      .post("/api/saved-searches")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        name: "Brooklyn houses",
        criteria: "city=Brooklyn&listingType=sale",
        frequency: "daily",
        emailAlerts: true,
        inAppAlerts: true,
      });

    expect(created.status).toBe(201);
    expect(created.body.data.matchCount).toBe(0);

    await new Promise((resolve) => setTimeout(resolve, 10));
    await approve(app, admin, listing.id);

    const list = await request(app)
      .get("/api/saved-searches")
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(list.body.data[0].matchCount).toBe(1);
    expect(list.body.data[0].newMatches).toBe(1);

    const updated = await request(app)
      .patch(`/api/saved-searches/${created.body.data.id}`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ name: "Park Slope houses", frequency: "weekly", emailAlerts: false });
    expect(updated.status).toBe(200);
    expect(updated.body.data.name).toBe("Park Slope houses");
    expect(updated.body.data.frequency).toBe("weekly");

    const digest = await request(app)
      .post("/api/saved-searches/digests/run")
      .set("Authorization", `Bearer ${admin}`);
    expect(digest.status).toBe(200);
    expect(digest.body.data.processed).toBe(1);
    expect(digest.body.data.totalMatches).toBe(1);
    expect(digest.body.data.emailsSent).toBe(0);

    const after = await request(app)
      .get("/api/saved-searches")
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(after.body.data[0].lastRunAt).not.toBeNull();
    expect(after.body.data[0].newMatches).toBe(0);

    const otherBuyer = await register(app, {
      ...buyerInput,
      email: "other-buyer@example.com",
      name: "Other Buyer",
    });

    const foreignPatch = await request(app)
      .patch(`/api/saved-searches/${created.body.data.id}`)
      .set("Authorization", `Bearer ${otherBuyer.token}`)
      .send({ name: "Hijacked search" });
    expect(foreignPatch.status).toBe(404);

    const foreignDelete = await request(app)
      .delete(`/api/saved-searches/${created.body.data.id}`)
      .set("Authorization", `Bearer ${otherBuyer.token}`);
    expect(foreignDelete.status).toBe(404);

    const deleted = await request(app)
      .delete(`/api/saved-searches/${created.body.data.id}`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(deleted.status).toBe(204);
  }, 30_000);

  it("sends an instant in-app alert once per approved match", async () => {
    const app = createApp();
    const agent = await register(app, agentInput);
    const buyer = await register(app, buyerInput);
    const admin = await adminToken(app);
    const listing = await createPendingListing(app, agent.token);

    const created = await request(app)
      .post("/api/saved-searches")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        name: "Instant Brooklyn",
        criteria: "city=Brooklyn&listingType=sale",
        frequency: "instant",
        emailAlerts: false,
        inAppAlerts: true,
      });
    expect(created.status).toBe(201);

    const approved = await request(app)
      .patch(`/api/admin/listings/${listing.id}/status`)
      .set("Authorization", `Bearer ${admin}`)
      .send({ status: "approved" });
    expect(approved.status).toBe(200);

    const notifications = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${buyer.token}`);
    const alerts = notifications.body.data.items.filter(
      (item: { type: string }) => item.type === "saved_search",
    );
    expect(alerts).toHaveLength(1);
    expect(alerts[0].href).toBe(`/properties/${listing.slug}`);

    const propertyDoc = await PropertyModel.findById(listing.id);
    expect(propertyDoc).not.toBeNull();
    await notifyInstantMatches(propertyDoc!);
    await notifyInstantMatches(propertyDoc!);

    const after = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(
      after.body.data.items.filter((item: { type: string }) => item.type === "saved_search"),
    ).toHaveLength(1);

    const digest = await runSavedSearchDigests();
    expect(digest.processed).toBe(0);
  }, 30_000);
});

describe("inquiry inbox", () => {
  it("lets agents triage their leads and blocks other agents", async () => {
    const app = createApp();
    const agent = await register(app, agentInput);
    const otherAgent = await register(app, {
      ...agentInput,
      email: "other@example.com",
      name: "Daniel Ortiz",
    });
    const buyer = await register(app, buyerInput);
    const admin = await adminToken(app);
    const listing = await createPendingListing(app, agent.token);
    await approve(app, admin, listing.id);

    const inquiry = await request(app)
      .post("/api/inquiries")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        propertyId: listing.id,
        name: "Priya Shah",
        email: "priya@example.com",
        message: "Could we tour this home on Saturday?",
        consent: true,
      });
    expect(inquiry.status).toBe(201);

    const agentInbox = await request(app)
      .get("/api/inquiries")
      .set("Authorization", `Bearer ${agent.token}`);
    expect(agentInbox.body.data).toHaveLength(1);
    expect(agentInbox.body.data[0].buyer.email).toBe("priya@example.com");
    expect(agentInbox.body.data[0].property.title).toBe(listingInput.title);

    const buyerInbox = await request(app)
      .get("/api/inquiries")
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(buyerInbox.body.data).toHaveLength(1);

    const foreignUpdate = await request(app)
      .patch(`/api/inquiries/${inquiry.body.data.id}`)
      .set("Authorization", `Bearer ${otherAgent.token}`)
      .send({ status: "contacted" });
    expect(foreignUpdate.status).toBe(403);

    const buyerUpdate = await request(app)
      .patch(`/api/inquiries/${inquiry.body.data.id}`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ status: "closed" });
    expect(buyerUpdate.status).toBe(403);

    const updated = await request(app)
      .patch(`/api/inquiries/${inquiry.body.data.id}`)
      .set("Authorization", `Bearer ${agent.token}`)
      .send({ status: "contacted", note: "Tour confirmed for Saturday at 10." });
    expect(updated.status).toBe(200);
    expect(updated.body.data.status).toBe("contacted");
    expect(updated.body.data.notes).toContain("Tour confirmed for Saturday at 10.");

    const buyerAfter = await request(app)
      .get("/api/inquiries")
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(buyerAfter.body.data[0].status).toBe("contacted");
    expect(buyerAfter.body.data[0].notes).toEqual([]);

    const agentAfter = await request(app)
      .get("/api/inquiries")
      .set("Authorization", `Bearer ${agent.token}`);
    expect(agentAfter.body.data[0].notes).toContain("Tour confirmed for Saturday at 10.");
    expect(agentAfter.body.data[0].conversationId).toBeNull();

    const conversation = await request(app)
      .post("/api/conversations")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ propertyId: listing.id });
    expect(conversation.status).toBe(201);

    const linked = await request(app)
      .get("/api/inquiries")
      .set("Authorization", `Bearer ${agent.token}`);
    expect(linked.body.data[0].conversationId).toBe(conversation.body.data.id);
  }, 30_000);
});

describe("conversations", () => {
  async function setup() {
    const app = createApp();
    const agent = await register(app, agentInput);
    const buyer = await register(app, buyerInput);
    const admin = await adminToken(app);
    const listing = await createPendingListing(app, agent.token);
    await approve(app, admin, listing.id);
    return { app, agent, buyer, listing };
  }

  it("creates one conversation per buyer/property and tracks unread per side", async () => {
    const { app, agent, buyer, listing } = await setup();

    const created = await request(app)
      .post("/api/conversations")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ propertyId: listing.id });
    expect(created.status).toBe(201);
    const conversationId = created.body.data.id as string;
    expect(created.body.data.counterpart.name).toBe("Maya Chen");

    const again = await request(app)
      .post("/api/conversations")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ propertyId: listing.id });
    expect(again.body.data.id).toBe(conversationId);

    const selfStart = await request(app)
      .post("/api/conversations")
      .set("Authorization", `Bearer ${agent.token}`)
      .send({ propertyId: listing.id });
    expect(selfStart.status).toBe(400);

    const sent = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ body: "Is the garden shared or private?" });
    expect(sent.status).toBe(201);

    const buyerUnread = await request(app)
      .get("/api/conversations/unread-count")
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(buyerUnread.body.data.count).toBe(0);

    const agentUnread = await request(app)
      .get("/api/conversations/unread-count")
      .set("Authorization", `Bearer ${agent.token}`);
    expect(agentUnread.body.data.count).toBe(1);

    const agentView = await request(app)
      .get(`/api/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${agent.token}`);
    expect(agentView.status).toBe(200);
    expect(agentView.body.data.messages).toHaveLength(1);
    expect(agentView.body.data.messages[0].readBy).toContain(agent.user.id);

    const cleared = await request(app)
      .get("/api/conversations/unread-count")
      .set("Authorization", `Bearer ${agent.token}`);
    expect(cleared.body.data.count).toBe(0);

    const reply = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${agent.token}`)
      .send({ body: "It is private and fenced." });
    expect(reply.status).toBe(201);

    const buyerUnreadAgain = await request(app)
      .get("/api/conversations/unread-count")
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(buyerUnreadAgain.body.data.count).toBe(1);

    const buyerView = await request(app)
      .get(`/api/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(buyerView.body.data.messages).toHaveLength(2);
    expect(buyerView.body.data.messages[1].body).toBe("It is private and fenced.");
    expect(buyerView.body.data.messages[1].readBy).toContain(buyer.user.id);

    const png = pngWithDimensions(200, 200, "chat-image");
    const pdf = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");

    const uploaded = await request(app)
      .post("/api/uploads/chat")
      .set("Authorization", `Bearer ${buyer.token}`)
      .attach("files", png, { filename: "garden.png", contentType: "image/png" })
      .attach("files", pdf, { filename: "floor-plan.pdf", contentType: "application/pdf" });

    expect(uploaded.status).toBe(201);
    expect(uploaded.body.data.files).toHaveLength(2);
    const files = uploaded.body.data.files as Array<{
      url: string;
      name: string;
      type: string;
      size: number;
    }>;
    expect(files[0]?.url).toMatch(/^\/uploads\/chat\//);
    expect(files[1]?.name).toBe("floor-plan.pdf");

    const attached = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        body: "",
        attachments: files.map(({ url, name, type, size }) => ({ url, name, type, size })),
      });
    expect(attached.status).toBe(201);
    expect(attached.body.data.body).toBe("");
    expect(attached.body.data.attachments).toHaveLength(2);

    const agentAttachmentView = await request(app)
      .get(`/api/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${agent.token}`);
    const lastMessage = agentAttachmentView.body.data.messages.at(-1) as {
      attachments: Array<{ name: string }>;
    };
    expect(lastMessage.attachments.map((item) => item.name)).toEqual([
      "garden.png",
      "floor-plan.pdf",
    ]);

    const rejectedUpload = await request(app)
      .post("/api/uploads/chat")
      .set("Authorization", `Bearer ${buyer.token}`)
      .attach("files", Buffer.from("not a file"), {
        filename: "notes.txt",
        contentType: "text/plain",
      });
    expect(rejectedUpload.status).toBe(400);

    const guestUpload = await request(app)
      .post("/api/uploads/chat")
      .attach("files", png, { filename: "guest.png", contentType: "image/png" });
    expect(guestUpload.status).toBe(401);

    for (const file of files) {
      await unlink(path.join(UPLOAD_ROOT, file.url.replace("/uploads/", ""))).catch(() => undefined);
    }

    const outsider = await register(app, {
      ...buyerInput,
      email: "outsider@example.com",
      name: "Outsider",
    });
    const denied = await request(app)
      .get(`/api/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${outsider.token}`);
    expect(denied.status).toBe(403);
  }, 30_000);
});
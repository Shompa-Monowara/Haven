import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

import { resetDatabase } from "./helpers";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../app";
import { connectDatabase, disconnectDatabase } from "../config/db";
import { AgentProfileModel } from "../models/agent-profile.model";
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

function listingInput(title: string) {
  return {
    title,
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
}

async function register(app: ReturnType<typeof createApp>, input: Record<string, unknown>) {
  const response = await request(app).post("/api/auth/register").send(input);
  expect(response.status).toBe(201);
  return {
    token: response.body.data.accessToken as string,
    user: response.body.data.user as { id: string },
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

async function createListing(
  app: ReturnType<typeof createApp>,
  token: string,
  title: string,
  submit: boolean,
) {
  const created = await request(app)
    .post("/api/properties")
    .set("Authorization", `Bearer ${token}`)
    .send(listingInput(title));
  expect(created.status).toBe(201);

  if (submit) {
    const submitted = await request(app)
      .post(`/api/properties/${created.body.data.id}/submit`)
      .set("Authorization", `Bearer ${token}`);
    expect(submitted.status).toBe(200);
  }

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

describe("public SEO surfaces", () => {
  it("publishes only approved listings in the sitemap and agent directory", async () => {
    const app = createApp();
    const agent = await register(app, agentInput);
    const admin = await adminSession(app);

    const approved = await createListing(app, agent.token, "Sunlit brownstone with a garden", true);
    const pending = await createListing(app, agent.token, "Pending cottage with a porch", true);

    await request(app)
      .patch(`/api/admin/listings/${approved.id}/status`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "approved" });

    const sitemap = await request(app).get("/sitemap.xml");
    expect(sitemap.status).toBe(200);
    expect(sitemap.headers["content-type"]).toContain("application/xml");
    expect(sitemap.text).toContain(approved.slug);
    expect(sitemap.text).not.toContain(pending.slug);
    expect(sitemap.text).toContain("/properties</loc>");
    expect(sitemap.text).toContain("/agents</loc>");

    const agents = await request(app).get("/api/agents");
    expect(agents.status).toBe(200);
    expect(agents.body.data).toHaveLength(1);
    expect(agents.body.data[0]).toMatchObject({ name: "Maya Chen", listingCount: 1 });

    const profile = await request(app).get(`/api/agents/${agent.user.id}`);
    expect(profile.status).toBe(200);
    expect(profile.body.data.listings).toHaveLength(1);
    expect(profile.body.data.listings[0].slug).toBe(approved.slug);

    const archived = await request(app)
      .post(`/api/admin/listings/${approved.id}/archive`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(archived.status).toBe(200);

    const sitemapAfter = await request(app).get("/sitemap.xml");
    expect(sitemapAfter.text).not.toContain(approved.slug);

    const profileAfter = await request(app).get(`/api/agents/${agent.user.id}`);
    expect(profileAfter.body.data.listings).toHaveLength(0);
  }, 30_000);

  it("hides a suspended agent from the directory and search", async () => {
    const app = createApp();
    const agent = await register(app, agentInput);
    const admin = await adminSession(app);
    const listing = await createListing(app, agent.token, "Garden villa with a courtyard", true);

    await request(app)
      .patch(`/api/admin/listings/${listing.id}/status`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "approved" });

    const suspended = await request(app)
      .patch(`/api/admin/users/${agent.user.id}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "suspended", reason: "Policy violations" });
    expect(suspended.status).toBe(200);

    const agents = await request(app).get("/api/agents");
    expect(agents.body.data).toHaveLength(0);

    const sitemap = await request(app).get("/sitemap.xml");
    expect(sitemap.text).not.toContain(listing.slug);
  }, 30_000);

  it("filters the agent directory by verification and minimum listing count", async () => {
    const app = createApp();

    const featured = await register(app, agentInput);
    const noListings = await register(app, {
      ...agentInput,
      name: "Noah Feld",
      email: "noah@example.com",
    });
    const unverified = await register(app, {
      ...agentInput,
      name: "Lucas Meyer",
      email: "lucas@example.com",
    });

    await AgentProfileModel.updateOne({ user: featured.user.id }, { $set: { verified: true } });
    await AgentProfileModel.updateOne({ user: noListings.user.id }, { $set: { verified: true } });
    await AgentProfileModel.updateOne({ user: unverified.user.id }, { $set: { verified: false } });

    const admin = await adminSession(app);
    const listing = await createListing(app, unverified.token, "Unverified listing with a porch", true);
    await request(app)
      .patch(`/api/admin/listings/${listing.id}/status`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "approved" });

    const all = await request(app).get("/api/agents");
    expect(all.body.data).toHaveLength(3);

    const minListings = await request(app).get("/api/agents?minListings=1");
    expect(minListings.status).toBe(200);
    expect(minListings.body.data).toHaveLength(1);
    expect(minListings.body.data[0]).toMatchObject({
      name: "Lucas Meyer",
      listingCount: 1,
      verified: false,
    });

    const verified = await request(app).get("/api/agents?verified=true");
    expect(
      (verified.body.data as Array<{ name: string }>).map((entry) => entry.name).sort(),
    ).toEqual(["Maya Chen", "Noah Feld"]);

    const verifiedWithListings = await request(app).get("/api/agents?verified=true&minListings=1");
    expect(verifiedWithListings.body.data).toHaveLength(0);

    const invalid = await request(app).get("/api/agents?minListings=-2");
    expect(invalid.status).toBe(400);
  }, 30_000);
});
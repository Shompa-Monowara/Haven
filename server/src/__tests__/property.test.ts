import { existsSync } from "node:fs";
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
  garages: 1,
  sizeSqft: 2860,
  lotSizeSqft: 3200,
  yearBuilt: 1908,
  address: {
    street: "148A Berkeley Place",
    city: "Brooklyn",
    state: "NY",
    zip: "11217",
    country: "United States",
    neighborhood: "Park Slope",
  },
  location: { lat: 40.6795, lng: -73.978 },
  amenities: ["Garden", "Fireplace"],
};

const imageInput = (index = 0) => ({
  url: `https://images.example.com/photo-${index}.jpg`,
  alt: `Photo ${index + 1}`,
  isCover: index === 0,
  order: index,
});

async function register(app: ReturnType<typeof createApp>, input: Record<string, unknown>) {
  const response = await request(app).post("/api/auth/register").send(input);
  expect(response.status).toBe(201);
  return response.body.data.accessToken as string;
}

async function createAdminToken(app: ReturnType<typeof createApp>) {
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

async function createListing(
  app: ReturnType<typeof createApp>,
  token: string,
  overrides: Record<string, unknown> = {},
) {
  const response = await request(app)
    .post("/api/properties")
    .set("Authorization", `Bearer ${token}`)
    .send({ ...listingInput, ...overrides });

  expect(response.status).toBe(201);
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

describe("listing lifecycle", () => {
  it("creates a draft that only the owner and admins can see", async () => {
    const app = createApp();
    const token = await register(app, agentInput);
    const listing = await createListing(app, token);

    expect(listing.status).toBe("draft");
    expect(listing.slug).toContain("sunlit-brownstone");
    expect(listing.agent.email).toBeUndefined();

    const ownerView = await request(app)
      .get(`/api/properties/${listing.slug}`)
      .set("Authorization", `Bearer ${token}`);
    expect(ownerView.status).toBe(200);
    expect(ownerView.body.data.status).toBe("draft");

    const guestView = await request(app).get(`/api/properties/${listing.slug}`);
    expect(guestView.status).toBe(404);

    const mine = await request(app)
      .get("/api/properties/mine")
      .set("Authorization", `Bearer ${token}`);
    expect(mine.status).toBe(200);
    expect(mine.body.data).toHaveLength(1);
  });

  it("blocks submission until the listing has three photos", async () => {
    const app = createApp();
    const token = await register(app, agentInput);
    const listing = await createListing(app, token);

    const blocked = await request(app)
      .post(`/api/properties/${listing.id}/submit`)
      .set("Authorization", `Bearer ${token}`);

    expect(blocked.status).toBe(400);
    expect(blocked.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "images" })]),
    );

    const patched = await request(app)
      .patch(`/api/properties/${listing.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ images: [imageInput(0), imageInput(1), imageInput(2)] });

    expect(patched.status).toBe(200);
    expect(patched.body.data.images).toHaveLength(3);

    const submitted = await request(app)
      .post(`/api/properties/${listing.id}/submit`)
      .set("Authorization", `Bearer ${token}`);

    expect(submitted.status).toBe(200);
    expect(submitted.body.data.status).toBe("pending");
  });

  it("keeps pending listings out of public search until an admin approves them", async () => {
    const app = createApp();
    const token = await register(app, agentInput);
    const listing = await createListing(app, token, {
      images: [imageInput(0), imageInput(1), imageInput(2)],
    });

    await request(app)
      .post(`/api/properties/${listing.id}/submit`)
      .set("Authorization", `Bearer ${token}`);

    const hidden = await request(app).get("/api/properties?city=Brooklyn");
    expect(hidden.body.data).toHaveLength(0);

    const adminToken = await createAdminToken(app);
    const approved = await request(app)
      .patch(`/api/admin/listings/${listing.id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "approved" });

    expect(approved.status).toBe(200);
    expect(approved.body.data.status).toBe("approved");

    const visible = await request(app).get("/api/properties?city=Brooklyn");
    expect(visible.body.data).toHaveLength(1);
    expect(visible.body.data[0].agent.name).toBe("Maya Chen");
    expect(visible.body.data[0].agent.verified).toBe(false);

    const detail = await request(app).get(`/api/properties/${listing.slug}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.views).toBe(1);

    const similar = await request(app).get(`/api/properties/${listing.slug}/similar`);
    expect(similar.status).toBe(200);
    expect(similar.body.data).toHaveLength(0);

    const relevance = await request(app).get("/api/properties?q=brownstone&sort=relevance");
    expect(relevance.status).toBe(200);
    expect(relevance.body.data).toHaveLength(1);

    const noRelevanceMatch = await request(app).get(
      "/api/properties?q=zzzunlikelytoken&sort=relevance",
    );
    expect(noRelevanceMatch.body.data).toHaveLength(0);

    const partialKeyword = await request(app).get("/api/properties?q=brown");
    expect(partialKeyword.body.data).toHaveLength(1);
  });

  it("requires a reason and enforces ownership when deciding or editing", async () => {
    const app = createApp();
    const token = await register(app, agentInput);
    const otherToken = await register(app, {
      ...agentInput,
      email: "other@example.com",
      name: "Daniel Ortiz",
      agency: "Cedar & Co",
    });
    const listing = await createListing(app, token, {
      images: [imageInput(0), imageInput(1), imageInput(2)],
    });

    const foreignEdit = await request(app)
      .patch(`/api/properties/${listing.id}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ price: 1 });
    expect(foreignEdit.status).toBe(403);

    await request(app)
      .post(`/api/properties/${listing.id}/submit`)
      .set("Authorization", `Bearer ${token}`);

    const adminToken = await createAdminToken(app);
    const missingReason = await request(app)
      .patch(`/api/admin/listings/${listing.id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "rejected" });

    expect(missingReason.status).toBe(400);
    expect(missingReason.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "reasonCategory" })]),
    );

    const changes = await request(app)
      .patch(`/api/admin/listings/${listing.id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "changes_requested", reasonCategory: "poor_photos", note: "Add daylight photos" });

    expect(changes.status).toBe(200);
    expect(changes.body.data.rejectionReason).toMatchObject({
      category: "poor_photos",
      note: "Add daylight photos",
    });

    const editable = await request(app)
      .get(`/api/properties/mine/${listing.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(editable.status).toBe(200);
    expect(editable.body.data.status).toBe("changes_requested");
  });

  it("archives approved listings and keeps them out of search", async () => {
    const app = createApp();
    const token = await register(app, agentInput);
    const listing = await createListing(app, token, {
      images: [imageInput(0), imageInput(1), imageInput(2)],
    });
    await request(app)
      .post(`/api/properties/${listing.id}/submit`)
      .set("Authorization", `Bearer ${token}`);

    const adminToken = await createAdminToken(app);
    await request(app)
      .patch(`/api/admin/listings/${listing.id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "approved" });

    const archived = await request(app)
      .post(`/api/properties/${listing.id}/archive`)
      .set("Authorization", `Bearer ${token}`);

    expect(archived.status).toBe(200);
    expect(archived.body.data.status).toBe("archived");

    const search = await request(app).get("/api/properties");
    expect(search.body.data).toHaveLength(0);

    const detail = await request(app).get(`/api/properties/${listing.slug}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.status).toBe("archived");
  });

  it("filters by map bounds and aggregates city counts", async () => {
    const app = createApp();
    const token = await register(app, agentInput);
    const adminToken = await createAdminToken(app);

    const brooklyn = await createListing(app, token, {
      images: [imageInput(0), imageInput(1), imageInput(2)],
    });

    const seattle = await createListing(app, token, {
      title: "Seattle condo with water views",
      price: 1_120_000,
      address: {
        street: "2607 Western Avenue",
        city: "Seattle",
        state: "WA",
        zip: "98121",
        country: "United States",
      },
      location: { lat: 47.6062, lng: -122.3321 },
      images: [imageInput(0), imageInput(1), imageInput(2)],
    });

    for (const listing of [brooklyn, seattle]) {
      await request(app)
        .post(`/api/properties/${listing.id}/submit`)
        .set("Authorization", `Bearer ${token}`);
      await request(app)
        .patch(`/api/admin/listings/${listing.id}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "approved" });
    }

    const bounded = await request(app).get(
      "/api/properties?bounds=-74.1,40.6,-73.8,40.8",
    );
    expect(bounded.status).toBe(200);
    expect(bounded.body.data).toHaveLength(1);
    expect(bounded.body.data[0].address.city).toBe("Brooklyn");

    const cities = await request(app).get("/api/locations/cities");
    expect(cities.status).toBe(200);
    expect(cities.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ city: "Brooklyn", count: 1 }),
        expect.objectContaining({ city: "Seattle", count: 1 }),
      ]),
    );

    const neighborhoods = await request(app).get(
      "/api/locations/neighborhoods?city=Brooklyn",
    );
    expect(neighborhoods.status).toBe(200);
    expect(neighborhoods.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ neighborhood: "Park Slope", count: 1 }),
      ]),
    );

    const missingCity = await request(app).get("/api/locations/neighborhoods");
    expect(missingCity.status).toBe(400);

    const invalid = await request(app).get("/api/properties?bounds=-74,40,-74,41");
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe("VALIDATION_ERROR");
  }, 30_000);

  it("matches free-text q against city, neighborhood, and ZIP", async () => {
    const app = createApp();
    const token = await register(app, agentInput);
    const adminToken = await createAdminToken(app);

    const brooklyn = await createListing(app, token, {
      images: [imageInput(0), imageInput(1), imageInput(2)],
    });

    const seattle = await createListing(app, token, {
      title: "Seattle condo with water views",
      price: 1_120_000,
      address: {
        street: "2607 Western Avenue",
        city: "Seattle",
        state: "WA",
        zip: "98121",
        country: "United States",
        neighborhood: "Belltown",
      },
      location: { lat: 47.6062, lng: -122.3321 },
      images: [imageInput(0), imageInput(1), imageInput(2)],
    });

    // Same Park Slope address as the approved listing but left pending, so it
    // must never surface in a free-text search.
    const pending = await createListing(app, token, {
      title: "Pending Park Slope co-op",
      images: [imageInput(0), imageInput(1), imageInput(2)],
    });

    for (const listing of [brooklyn, seattle]) {
      await request(app)
        .post(`/api/properties/${listing.id}/submit`)
        .set("Authorization", `Bearer ${token}`);
      const approved = await request(app)
        .patch(`/api/admin/listings/${listing.id}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "approved" });
      expect(approved.status).toBe(200);
    }

    await request(app)
      .post(`/api/properties/${pending.id}/submit`)
      .set("Authorization", `Bearer ${token}`);

    const byNeighborhood = await request(app).get(
      `/api/properties?q=${encodeURIComponent("Park Slope")}`,
    );
    expect(byNeighborhood.status).toBe(200);
    expect(byNeighborhood.body.data).toHaveLength(1);
    expect(byNeighborhood.body.data[0].id).toBe(brooklyn.id);

    const byZip = await request(app).get("/api/properties?q=11217");
    expect(byZip.status).toBe(200);
    expect(byZip.body.data).toHaveLength(1);
    expect(byZip.body.data[0].id).toBe(brooklyn.id);

    const byCity = await request(app).get(`/api/properties?q=${encodeURIComponent("Brooklyn")}`);
    expect(byCity.status).toBe(200);
    expect(byCity.body.data).toHaveLength(1);
    expect(byCity.body.data[0].id).toBe(brooklyn.id);

    for (const response of [byNeighborhood, byZip, byCity]) {
      expect(
        response.body.data.some((item: { id: string }) => item.id === pending.id),
      ).toBe(false);
    }
  }, 30_000);
});

describe("uploads", () => {
  it("accepts a PNG upload and rejects non-images", async () => {
    const app = createApp();
    const token = await register(app, agentInput);

    const png = pngWithDimensions(800, 600, "test-image");

    const uploaded = await request(app)
      .post("/api/uploads/sign")
      .set("Authorization", `Bearer ${token}`)
      .attach("images", png, { filename: "living-room.png", contentType: "image/png" });

    expect(uploaded.status).toBe(201);
    expect(uploaded.body.data.images).toHaveLength(1);
    const url = uploaded.body.data.images[0].url as string;
    expect(url).toMatch(/^\/uploads\/properties\/.+\/.*\.png$/);

    const served = await request(app).get(url);
    expect(served.status).toBe(200);
    expect(served.headers["content-type"]).toContain("image/png");

    const rejected = await request(app)
      .post("/api/uploads/sign")
      .set("Authorization", `Bearer ${token}`)
      .attach("images", Buffer.from("not an image"), {
        filename: "notes.txt",
        contentType: "text/plain",
      });

    expect(rejected.status).toBe(400);

    const tooSmall = await request(app)
      .post("/api/uploads/sign")
      .set("Authorization", `Bearer ${token}`)
      .attach("images", pngWithDimensions(50, 50), {
        filename: "tiny.png",
        contentType: "image/png",
      });
    expect(tooSmall.status).toBe(400);

    const tooLarge = await request(app)
      .post("/api/uploads/sign")
      .set("Authorization", `Bearer ${token}`)
      .attach("images", pngWithDimensions(9000, 600), {
        filename: "huge.png",
        contentType: "image/png",
      });
    expect(tooLarge.status).toBe(400);

    const guest = await request(app)
      .post("/api/uploads/sign")
      .attach("images", png, { filename: "x.png", contentType: "image/png" });
    expect(guest.status).toBe(401);

    await unlink(path.join(UPLOAD_ROOT, url.replace("/uploads/", ""))).catch(() => undefined);
  });

  it("removes replaced and orphaned upload files", async () => {
    const app = createApp();
    const token = await register(app, agentInput);

    const png = pngWithDimensions(800, 600, "cleanup-image");

    async function upload(): Promise<{ url: string; absolutePath: string }> {
      const response = await request(app)
        .post("/api/uploads/sign")
        .set("Authorization", `Bearer ${token}`)
        .attach("images", png, { filename: "photo.png", contentType: "image/png" });
      expect(response.status).toBe(201);
      const fileUrl = response.body.data.images[0].url as string;
      return {
        url: fileUrl,
        absolutePath: path.join(UPLOAD_ROOT, fileUrl.replace("/uploads/", "")),
      };
    }

    const first = await upload();
    const second = await upload();

    const created = await request(app)
      .post("/api/properties")
      .set("Authorization", `Bearer ${token}`)
      .send({
        ...listingInput,
        images: [{ url: first.url, alt: "First", isCover: true, order: 0 }],
      });
    expect(created.status).toBe(201);
    expect(existsSync(first.absolutePath)).toBe(true);

    const patched = await request(app)
      .patch(`/api/properties/${created.body.data.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ images: [{ url: second.url, alt: "Second", isCover: true, order: 0 }] });
    expect(patched.status).toBe(200);
    expect(existsSync(first.absolutePath)).toBe(false);
    expect(existsSync(second.absolutePath)).toBe(true);

    const deleted = await request(app)
      .delete(`/api/properties/${created.body.data.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(deleted.status).toBe(204);
    expect(existsSync(second.absolutePath)).toBe(false);
  });
});

describe("inquiries", () => {
  async function approvedListing(app: ReturnType<typeof createApp>) {
    const agentToken = await register(app, agentInput);
    const listing = await createListing(app, agentToken, {
      images: [imageInput(0), imageInput(1), imageInput(2)],
    });
    await request(app)
      .post(`/api/properties/${listing.id}/submit`)
      .set("Authorization", `Bearer ${agentToken}`);
    const adminToken = await createAdminToken(app);
    await request(app)
      .patch(`/api/admin/listings/${listing.id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "approved" });
    return { listing, agentToken };
  }

  it("records an inquiry once and refuses self-inquiries", async () => {
    const app = createApp();
    const { listing, agentToken } = await approvedListing(app);
    const buyerToken = await register(app, buyerInput);

    const inquiry = await request(app)
      .post("/api/inquiries")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({
        propertyId: listing.id,
        name: "Priya Shah",
        email: "priya@example.com",
        message: "I would like to schedule a tour this weekend.",
        consent: true,
      });

    expect(inquiry.status).toBe(201);
    expect(inquiry.body.data.responseTimeMinutes).toBe(120);

    const duplicate = await request(app)
      .post("/api/inquiries")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({
        propertyId: listing.id,
        name: "Priya Shah",
        email: "priya@example.com",
        message: "Following up on my tour request.",
        consent: true,
      });
    expect(duplicate.status).toBe(409);

    const self = await request(app)
      .post("/api/inquiries")
      .set("Authorization", `Bearer ${agentToken}`)
      .send({
        propertyId: listing.id,
        name: "Maya Chen",
        email: "maya@example.com",
        message: "This is my own listing and I cannot inquire.",
        consent: true,
      });
    expect(self.status).toBe(400);

    const guest = await request(app).post("/api/inquiries").send({
      propertyId: listing.id,
      name: "Guest",
      email: "guest@example.com",
      message: "Can I see this home tomorrow morning?",
      consent: true,
    });
    expect(guest.status).toBe(401);
  }, 20_000);
});
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../app";

describe("GET /api/health", () => {
  it("returns the success envelope with uptime and database status", async () => {
    const response = await request(createApp()).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("ok");
    expect(["disconnected", "connected"]).toContain(response.body.data.database);
    expect(typeof response.body.data.uptimeSeconds).toBe("number");
    expect(response.headers["x-request-id"]).toBeTruthy();
  });
});

describe("unknown routes", () => {
  it("returns a structured 404 error", async () => {
    const response = await request(createApp()).get("/api/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      error: { code: "NOT_FOUND" },
    });
  });
});
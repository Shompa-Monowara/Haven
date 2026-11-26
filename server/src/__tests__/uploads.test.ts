import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { configMock, uploadStreamMock, destroyMock } = vi.hoisted(() => ({
  configMock: vi.fn(),
  uploadStreamMock: vi.fn(),
  destroyMock: vi.fn(),
}));

vi.mock("cloudinary", () => ({
  v2: {
    config: configMock,
    uploader: {
      upload_stream: uploadStreamMock,
      destroy: destroyMock,
    },
  },
}));

import { createImageStore, isCloudinaryConfigured } from "../lib/uploads";

let tempDirs: string[] = [];

async function makeTempDir() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "haven-uploads-"));
  tempDirs.push(dir);
  return dir;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs = [];
});

describe("upload storage provider", () => {
  it("writes to local disk and never calls Cloudinary when it is not configured", async () => {
    const root = await makeTempDir();
    const store = createImageStore({ localRoot: root });

    expect(store.provider).toBe("local");

    const result = await store.saveImage(Buffer.from("photo-bytes"), {
      folder: "avatars/user-1",
      filename: "avatar.webp",
    });

    expect(result).toEqual({
      url: "/uploads/avatars/user-1/avatar.webp",
      publicId: "avatars/user-1/avatar.webp",
    });
    expect(existsSync(path.join(root, "avatars", "user-1", "avatar.webp"))).toBe(true);
    expect(uploadStreamMock).not.toHaveBeenCalled();
    expect(configMock).not.toHaveBeenCalled();
  });

  it("uses Cloudinary upload_stream when all three credentials are present", async () => {
    uploadStreamMock.mockImplementation(
      (
        options: { folder: string; public_id: string },
        callback: (error: unknown, result: unknown) => void,
      ) => {
        callback(null, {
          secure_url: `https://res.cloudinary.com/demo/image/upload/${options.folder}/${options.public_id}.png`,
          public_id: `${options.folder}/${options.public_id}`,
        });
        return { end: vi.fn() };
      },
    );

    const store = createImageStore({
      cloudName: "demo",
      apiKey: "key",
      apiSecret: "secret",
      localRoot: await makeTempDir(),
    });

    expect(store.provider).toBe("cloudinary");
    expect(configMock).toHaveBeenCalledWith(expect.objectContaining({ cloud_name: "demo" }));

    const result = await store.saveImage(Buffer.from("photo-bytes"), {
      folder: "properties/prop-1",
      filename: "photo.png",
    });

    expect(uploadStreamMock).toHaveBeenCalledTimes(1);
    expect(result.publicId).toBe("properties/prop-1/photo");
    expect(result.url).toContain("res.cloudinary.com");
  });

  it("requires the Cloudinary credentials to be provided together", () => {
    expect(isCloudinaryConfigured({})).toBe(false);
    expect(isCloudinaryConfigured({ cloudName: "demo", apiKey: "key" })).toBe(false);
    expect(
      isCloudinaryConfigured({ cloudName: "demo", apiKey: "key", apiSecret: "secret" }),
    ).toBe(true);
  });
});
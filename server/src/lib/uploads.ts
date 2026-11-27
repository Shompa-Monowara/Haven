import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { v2 as cloudinary } from "cloudinary";

import { env } from "../config/env";
import { logger } from "./logger";

/** Absolute path of the uploads directory (configurable via UPLOAD_DIR). */
export const UPLOAD_ROOT = env.UPLOAD_DIR
  ? path.resolve(env.UPLOAD_DIR)
  : path.resolve(__dirname, "../../uploads");

/** Cloudinary deletion is only allowed for assets under these top-level folders. */
const ALLOWED_PREFIXES = ["properties/", "avatars/", "chat/"] as const;

export interface StoredUpload {
  url: string;
  publicId: string;
}

export interface CloudinarySettings {
  cloudName?: string;
  apiKey?: string;
  apiSecret?: string;
}

export interface ImageStoreSettings extends CloudinarySettings {
  localRoot?: string;
}

export interface ImageStore {
  provider: "cloudinary" | "local";
  saveImage(buffer: Buffer, options: { folder: string; filename: string }): Promise<StoredUpload>;
  /** Used for non-image chat attachments (PDFs); `raw` keeps the filename on Cloudinary. */
  saveRawFile(buffer: Buffer, options: { folder: string; filename: string }): Promise<StoredUpload>;
  deleteUploads(items: Iterable<string>): Promise<void>;
}

/** Cloudinary is used only when all three credentials are present. */
export function isCloudinaryConfigured(settings: CloudinarySettings): boolean {
  return Boolean(settings.cloudName && settings.apiKey && settings.apiSecret);
}

function isAllowedPublicId(publicId: string): boolean {
  return ALLOWED_PREFIXES.some((prefix) => publicId.startsWith(prefix));
}

/** Resolves `relative` under `root`, refusing anything that escapes it. */
function resolveWithin(root: string, relative: string): string | null {
  const resolved = path.resolve(root, relative);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) return null;
  return resolved;
}

/**
 * Derives a Cloudinary public ID from a stored URL. Bare public IDs are
 * returned unchanged; versioned URLs are stripped of the transform/version
 * prefix and file extension.
 */
function cloudinaryPublicIdFrom(item: string): string | null {
  if (!/^https?:\/\//i.test(item)) return item;

  const marker = "/upload/";
  const index = item.indexOf(marker);
  if (index === -1) return null;

  let rest = item.slice(index + marker.length).split("?")[0]?.split("#")[0] ?? "";
  rest = rest.replace(/^v\d+\//, "");

  const lastSlash = rest.lastIndexOf("/");
  const file = lastSlash === -1 ? rest : rest.slice(lastSlash + 1);
  const dot = file.lastIndexOf(".");
  if (dot > 0) rest = rest.slice(0, rest.length - (file.length - dot));

  return rest || null;
}

/**
 * Creates a storage backend. With Cloudinary configured, images go to
 * Cloudinary via `upload_stream`; otherwise files are written under `localRoot`
 * exactly like before.
 */
export function createImageStore(settings: ImageStoreSettings = {}): ImageStore {
  const localRoot = settings.localRoot ? path.resolve(settings.localRoot) : UPLOAD_ROOT;
  const useCloudinary = isCloudinaryConfigured(settings);

  if (useCloudinary) {
    cloudinary.config({
      cloud_name: settings.cloudName,
      api_key: settings.apiKey,
      api_secret: settings.apiSecret,
      secure: true,
    });
  }

  function uploadToCloudinary(
    buffer: Buffer,
    folder: string,
    filename: string,
    resourceType: "image" | "raw",
  ): Promise<StoredUpload> {
    // Image public IDs omit the extension (Cloudinary stores the format); raw
    // assets keep it so downloads retain a file name.
    const publicId = resourceType === "raw" ? filename : path.parse(filename).name;

    return new Promise<StoredUpload>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, public_id: publicId, resource_type: resourceType, overwrite: false },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error("Cloudinary upload failed"));
            return;
          }
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );
      stream.end(buffer);
    });
  }

  async function writeLocal(
    buffer: Buffer,
    folder: string,
    filename: string,
  ): Promise<StoredUpload> {
    const directory = resolveWithin(localRoot, folder);
    if (!directory) throw new Error("Refusing to write outside the uploads directory");

    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, filename), buffer);

    return {
      url: `/uploads/${folder}/${filename}`,
      publicId: `${folder}/${filename}`,
    };
  }

  function save(
    buffer: Buffer,
    folder: string,
    filename: string,
    resourceType: "image" | "raw",
  ): Promise<StoredUpload> {
    return useCloudinary
      ? uploadToCloudinary(buffer, folder, filename, resourceType)
      : writeLocal(buffer, folder, filename);
  }

  async function deleteLocal(item: string): Promise<void> {
    const relative = item.startsWith("/uploads/")
      ? item.slice("/uploads/".length)
      : isAllowedPublicId(item)
        ? item
        : null;
    if (!relative) return;

    const filePath = resolveWithin(localRoot, relative);
    if (!filePath) return;

    try {
      await unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        logger.warn({ err: error, filePath }, "Failed to delete uploaded file");
      }
    }
  }

  async function deleteCloudinary(item: string): Promise<void> {
    const publicId = cloudinaryPublicIdFrom(item);
    if (!publicId || !isAllowedPublicId(publicId)) return;

    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
    } catch (error) {
      logger.warn({ err: error, publicId }, "Failed to delete Cloudinary asset");
    }
  }

  async function deleteUploads(items: Iterable<string>): Promise<void> {
    for (const item of new Set(items)) {
      if (!item) continue;
      if (useCloudinary) {
        await deleteCloudinary(item);
      } else {
        await deleteLocal(item);
      }
    }
  }

  return {
    provider: useCloudinary ? "cloudinary" : "local",
    saveImage: (buffer, { folder, filename }) => save(buffer, folder, filename, "image"),
    saveRawFile: (buffer, { folder, filename }) => save(buffer, folder, filename, "raw"),
    deleteUploads,
  };
}

// Tests must never call the real Cloudinary API. Force the default store onto
// local disk in test mode even if the developer's .env contains Cloudinary
// credentials. Explicit `createImageStore` callers are unaffected.
const defaultStore = createImageStore(
  env.NODE_ENV === "test"
    ? { localRoot: UPLOAD_ROOT }
    : {
        cloudName: env.CLOUDINARY_CLOUD_NAME,
        apiKey: env.CLOUDINARY_API_KEY,
        apiSecret: env.CLOUDINARY_API_SECRET,
        localRoot: UPLOAD_ROOT,
      },
);

export const storageProvider = defaultStore.provider;
export const saveImage = defaultStore.saveImage;
export const saveRawFile = defaultStore.saveRawFile;
export const deleteUploads = defaultStore.deleteUploads;

/**
 * Resolves a public `/uploads/...` URL to an absolute path inside UPLOAD_ROOT.
 * Returns null for external URLs or any path that would escape the directory.
 */
export function resolveUploadPath(url: string): string | null {
  if (!url.startsWith("/uploads/")) return null;
  return resolveWithin(UPLOAD_ROOT, url.slice("/uploads/".length));
}
import { unlink } from "node:fs/promises";
import path from "node:path";

import { env } from "../config/env";
import { logger } from "./logger";

/** Absolute path of the uploads directory (configurable via UPLOAD_DIR). */
export const UPLOAD_ROOT = env.UPLOAD_DIR
  ? path.resolve(env.UPLOAD_DIR)
  : path.resolve(__dirname, "../../uploads");

/**
 * Resolves a public `/uploads/...` URL to an absolute path inside UPLOAD_ROOT.
 * Returns null for external URLs or any path that would escape the directory.
 */
export function resolveUploadPath(url: string): string | null {
  if (!url.startsWith("/uploads/")) return null;

  const relative = url.slice("/uploads/".length);
  const resolved = path.resolve(UPLOAD_ROOT, relative);

  if (resolved !== UPLOAD_ROOT && !resolved.startsWith(`${UPLOAD_ROOT}${path.sep}`)) {
    return null;
  }

  return resolved;
}

/** Deletes local upload files for the given public URLs, ignoring external URLs and missing files. */
export async function deleteLocalUploads(urls: Iterable<string>): Promise<void> {
  for (const url of new Set(urls)) {
    const filePath = resolveUploadPath(url);
    if (!filePath) continue;

    try {
      await unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        logger.warn({ err: error, filePath }, "Failed to delete uploaded file");
      }
    }
  }
}
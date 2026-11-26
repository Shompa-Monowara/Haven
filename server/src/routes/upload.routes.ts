import { randomUUID } from "node:crypto";
import path from "node:path";

import { Router } from "express";
import multer from "multer";
import sharp from "sharp";

import { ApiError } from "../lib/api-error";
import { asyncHandler } from "../lib/async-handler";
import { validateImage } from "../lib/images";
import { toUserDto } from "../lib/serializers";
import { deleteUploads, saveImage, saveRawFile, UPLOAD_ROOT } from "../lib/uploads";
import { UserModel } from "../models/user.model";
import { requireAuth, requireRole } from "../middleware/auth";
import { userRateLimit } from "../middleware/rate-limit";

export { UPLOAD_ROOT };

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_PROPERTY_TOTAL_BYTES = 50 * 1024 * 1024;
const MAX_CHAT_TOTAL_BYTES = 25 * 1024 * 1024;

const PROPERTY_IMAGE_RULES = { minWidth: 400, minHeight: 300 };
const CHAT_IMAGE_RULES = { minWidth: 64, minHeight: 64 };

const allowedTypes: Record<string, { extension: string; signature: (buffer: Buffer) => boolean }> = {
  "image/jpeg": {
    extension: "jpg",
    signature: (buffer) => buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  },
  "image/png": {
    extension: "png",
    signature: (buffer) =>
      buffer.length > 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a,
  },
  "image/webp": {
    extension: "webp",
    signature: (buffer) =>
      buffer.length > 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP",
  },
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 20 },
  fileFilter: (_req, file, callback) => {
    if (!allowedTypes[file.mimetype]) {
      callback(ApiError.badRequest("Only JPG, PNG, and WebP images are supported"));
      return;
    }
    callback(null, true);
  },
});

const chatAllowedTypes: Record<string, { extension: string; signature: (buffer: Buffer) => boolean }> = {
  ...allowedTypes,
  "application/pdf": {
    extension: "pdf",
    signature: (buffer) => buffer.length > 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-",
  },
};

const chatUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 3 },
  fileFilter: (_req, file, callback) => {
    if (!chatAllowedTypes[file.mimetype]) {
      callback(ApiError.badRequest("Attach JPG, PNG, WebP, or PDF files"));
      return;
    }
    callback(null, true);
  },
});

export const uploadRouter = Router();

const propertyUploadLimiter = userRateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  message: "You are uploading too many files. Please wait a few minutes and try again.",
});

const chatUploadLimiter = userRateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: "You are uploading too many files. Please wait a few minutes and try again.",
});

const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AVATAR_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!allowedTypes[file.mimetype]) {
      callback(ApiError.badRequest("Only JPG, PNG, and WebP images are supported"));
      return;
    }
    callback(null, true);
  },
});

const avatarLimiter = userRateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: "You are uploading too many photos. Please wait a few minutes and try again.",
});

/** Only use an id as a folder segment when it looks like a Mongo ObjectId. */
function asObjectId(value: unknown): string | null {
  return typeof value === "string" && /^[a-f0-9]{24}$/i.test(value) ? value : null;
}

uploadRouter.post(
  "/sign",
  requireAuth,
  requireRole("agent", "admin"),
  propertyUploadLimiter,
  upload.array("images", 20),
  asyncHandler(async (req, res) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];

    if (!files.length) {
      throw ApiError.badRequest("Choose at least one image to upload");
    }

    const userId = req.auth!.id;

    // Validate every file before writing anything so a rejected batch leaves no files behind.
    let totalBytes = 0;
    for (const file of files) {
      const type = allowedTypes[file.mimetype];

      if (!type || !type.signature(file.buffer)) {
        throw ApiError.badRequest(`"${file.originalname}" is not a valid image file`);
      }

      const dimensionError = validateImage(file.buffer, file.mimetype, PROPERTY_IMAGE_RULES);
      if (dimensionError) {
        throw ApiError.badRequest(`"${file.originalname}": ${dimensionError}`);
      }

      totalBytes += file.size;
    }

    if (totalBytes > MAX_PROPERTY_TOTAL_BYTES) {
      throw ApiError.badRequest("This upload batch is too large (50MB maximum per request)");
    }

    // Prefer properties/<propertyId>/<uuid> once a draft exists; fall back to
    // the user's folder while a brand-new listing has no id yet.
    const propertyId = asObjectId(req.body.propertyId);
    const folder = propertyId ? `properties/${propertyId}` : `properties/${userId}`;

    const images: Array<{ url: string; publicId: string; size: number }> = [];

    for (const file of files) {
      const type = allowedTypes[file.mimetype]!;
      const fileName = `${randomUUID()}.${type.extension}`;
      const stored = await saveImage(file.buffer, { folder, filename: fileName });

      images.push({ url: stored.url, publicId: stored.publicId, size: file.size });
    }

    res.status(201).json({ data: { images } });
  }),
);

uploadRouter.post(
  "/chat",
  requireAuth,
  chatUploadLimiter,
  chatUpload.array("files", 3),
  asyncHandler(async (req, res) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];

    if (!files.length) {
      throw ApiError.badRequest("Choose at least one file to attach");
    }

    const userId = req.auth!.id;

    let totalBytes = 0;
    for (const file of files) {
      const type = chatAllowedTypes[file.mimetype];

      if (!type || !type.signature(file.buffer)) {
        throw ApiError.badRequest(`"${file.originalname}" is not a valid file`);
      }

      if (file.mimetype.startsWith("image/")) {
        const dimensionError = validateImage(file.buffer, file.mimetype, CHAT_IMAGE_RULES);
        if (dimensionError) {
          throw ApiError.badRequest(`"${file.originalname}": ${dimensionError}`);
        }
      }

      totalBytes += file.size;
    }

    if (totalBytes > MAX_CHAT_TOTAL_BYTES) {
      throw ApiError.badRequest("This attachment batch is too large (25MB maximum per message)");
    }

    const conversationId = asObjectId(req.body.conversationId);
    const folder = conversationId ? `chat/${conversationId}` : `chat/${userId}`;

    const attachments: Array<{
      url: string;
      publicId: string;
      name: string;
      type: string;
      size: number;
    }> = [];

    for (const file of files) {
      const type = chatAllowedTypes[file.mimetype]!;
      const fileName = `${randomUUID()}.${type.extension}`;
      // Images go through the image pipeline; PDFs are stored as raw files
      // (Cloudinary `raw`) so they survive redeploys without image transforms.
      const stored =
        file.mimetype === "application/pdf"
          ? await saveRawFile(file.buffer, { folder, filename: fileName })
          : await saveImage(file.buffer, { folder, filename: fileName });

      attachments.push({
        url: stored.url,
        publicId: stored.publicId,
        name: (path.basename(file.originalname) || "attachment").slice(0, 120),
        type: file.mimetype,
        size: file.size,
      });
    }

    res.status(201).json({ data: { files: attachments } });
  }),
);

uploadRouter.post(
  "/avatar",
  requireAuth,
  avatarLimiter,
  avatarUpload.single("file"),
  asyncHandler(async (req, res) => {
    const file = req.file;

    if (!file) {
      throw ApiError.badRequest("Choose a photo to upload");
    }

    const type = allowedTypes[file.mimetype];
    if (!type || !type.signature(file.buffer)) {
      throw ApiError.badRequest("That file is not a valid image");
    }

    const dimensionError = validateImage(file.buffer, file.mimetype, {
      minWidth: 200,
      minHeight: 200,
    });
    if (dimensionError) {
      throw ApiError.badRequest(dimensionError);
    }

    const user = await UserModel.findById(req.auth!.id);
    if (!user) throw ApiError.unauthorized();

    let processed: Buffer;
    try {
      processed = await sharp(file.buffer)
        .rotate()
        .resize(400, 400, { fit: "cover", position: "centre" })
        .webp({ quality: 82 })
        .toBuffer();
    } catch {
      throw ApiError.badRequest("That image could not be processed");
    }

    const fileName = `${randomUUID()}.webp`;
    const stored = await saveImage(processed, {
      folder: `avatars/${user.id}`,
      filename: fileName,
    });

    // Snapshot the old references before reassigning: Mongoose nested paths can
    // mutate in place, so reading `user.avatar` afterwards would point at the new file.
    const previous = [user.avatar?.url, user.avatar?.publicId].filter(
      (value): value is string => Boolean(value),
    );
    user.avatar = { url: stored.url, publicId: stored.publicId };
    await user.save();

    if (previous.length) await deleteUploads(previous);

    res.status(201).json({ data: { user: toUserDto(user) } });
  }),
);

uploadRouter.delete(
  "/avatar",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await UserModel.findById(req.auth!.id);
    if (!user) throw ApiError.unauthorized();

    const previous = [user.avatar?.url, user.avatar?.publicId].filter(
      (value): value is string => Boolean(value),
    );
    user.avatar = undefined;
    await user.save();

    if (previous.length) await deleteUploads(previous);

    res.json({ data: { user: toUserDto(user) } });
  }),
);
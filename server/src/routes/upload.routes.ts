import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { Router } from "express";
import multer from "multer";
import sharp from "sharp";

import { ApiError } from "../lib/api-error";
import { asyncHandler } from "../lib/async-handler";
import { validateImage } from "../lib/images";
import { toUserDto } from "../lib/serializers";
import { deleteLocalUploads, UPLOAD_ROOT } from "../lib/uploads";
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

    const directory = path.join(UPLOAD_ROOT, "properties", userId);
    await mkdir(directory, { recursive: true });

    const images = [];

    for (const file of files) {
      const type = allowedTypes[file.mimetype]!;
      const fileName = `${randomUUID()}.${type.extension}`;
      await writeFile(path.join(directory, fileName), file.buffer);

      images.push({
        url: `/uploads/properties/${userId}/${fileName}`,
        publicId: `properties/${userId}/${fileName}`,
        size: file.size,
      });
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

    const directory = path.join(UPLOAD_ROOT, "chat", userId);
    await mkdir(directory, { recursive: true });

    const attachments = [];

    for (const file of files) {
      const type = chatAllowedTypes[file.mimetype]!;
      const fileName = `${randomUUID()}.${type.extension}`;
      await writeFile(path.join(directory, fileName), file.buffer);

      attachments.push({
        url: `/uploads/chat/${userId}/${fileName}`,
        publicId: `chat/${userId}/${fileName}`,
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

    const directory = path.join(UPLOAD_ROOT, "avatars", user.id);
    await mkdir(directory, { recursive: true });

    const fileName = `${randomUUID()}.webp`;
    const filePath = path.join(directory, fileName);

    try {
      await sharp(file.buffer)
        .rotate()
        .resize(400, 400, { fit: "cover", position: "centre" })
        .webp({ quality: 82 })
        .toFile(filePath);
    } catch {
      throw ApiError.badRequest("That image could not be processed");
    }

    const previous = user.avatar?.url;
    user.avatar = {
      url: `/uploads/avatars/${user.id}/${fileName}`,
      publicId: `avatars/${user.id}/${fileName}`,
    };
    await user.save();

    if (previous) await deleteLocalUploads([previous]);

    res.status(201).json({ data: { user: toUserDto(user) } });
  }),
);

uploadRouter.delete(
  "/avatar",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await UserModel.findById(req.auth!.id);
    if (!user) throw ApiError.unauthorized();

    const previous = user.avatar?.url;
    user.avatar = undefined;
    await user.save();

    if (previous) await deleteLocalUploads([previous]);

    res.json({ data: { user: toUserDto(user) } });
  }),
);
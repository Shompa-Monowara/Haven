import type { ErrorRequestHandler, RequestHandler } from "express";
import { MulterError } from "multer";
import { ZodError } from "zod";

import { isProduction } from "../config/env";
import { ApiError } from "../lib/api-error";
import { logger } from "../lib/logger";

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
  });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const requestId = res.locals.requestId as string | undefined;

  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
        ...(requestId ? { requestId } : {}),
      },
    });
    return;
  }

  if (error instanceof MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "The uploaded file is too large"
        : error.code === "LIMIT_FILE_COUNT"
          ? "Too many files in one upload"
          : error.code === "LIMIT_UNEXPECTED_FILE"
            ? "Unexpected file field"
            : "The upload could not be processed";
    res.status(400).json({
      error: {
        code: "UPLOAD_ERROR",
        message,
        ...(requestId ? { requestId } : {}),
      },
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
        ...(requestId ? { requestId } : {}),
      },
    });
    return;
  }

  if (typeof error === "object" && error !== null && "code" in error) {
    const mongoError = error as { code: unknown; keyValue?: Record<string, unknown> };

    if (mongoError.code === 11000) {
      res.status(409).json({
        error: {
          code: "DUPLICATE_KEY",
          message: "A record with those values already exists",
          ...(mongoError.keyValue ? { details: mongoError.keyValue } : {}),
          ...(requestId ? { requestId } : {}),
        },
      });
      return;
    }
  }

  logger.error({ err: error, requestId }, "Unhandled request error");

  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: isProduction ? "Something went wrong. Please try again." : String(error),
      ...(requestId ? { requestId } : {}),
    },
  });
};
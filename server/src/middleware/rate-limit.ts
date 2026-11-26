import type { Request } from "express";
import rateLimit from "express-rate-limit";

import { env } from "../config/env";

interface RateLimitOptions {
  windowMs: number;
  limit: number;
  message?: string;
}

/**
 * Rate limiter keyed by the authenticated user.
 *
 * These limiters are always mounted after `requireAuth`, so `req.auth` is
 * available. Requests without auth fall into a single bucket, but they are
 * rejected by `requireAuth` before reaching the handler anyway.
 */
export function userRateLimit({ windowMs, limit, message }: RateLimitOptions) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: () => env.NODE_ENV === "test",
    keyGenerator: (req: Request) => String(req.auth?.id ?? "unauthenticated"),
    handler: (_req, res) => {
      res.status(429).json({
        error: {
          code: "RATE_LIMITED",
          message:
            message ?? "Too many requests. Please slow down and try again in a few minutes.",
        },
      });
    },
  });
}

interface KeyedRateLimitOptions {
  windowMs: number;
  limit: number;
  /** Derives the bucket key from the request, for example the client IP or email. */
  key: (req: Request) => string;
  message?: string;
  /**
   * Public, unauthenticated endpoints accept guest input, so the limiter keys
   * off caller-supplied data (IP, email). Enabled in production; skipped in
   * tests unless `enforced` is set (the limiter's own test sets it).
   */
  enforced?: boolean;
}

export function keyedRateLimit({ windowMs, limit, key, message, enforced = false }: KeyedRateLimitOptions) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: () => env.NODE_ENV === "test" && !enforced,
    keyGenerator: key,
    handler: (_req, res) => {
      res.status(429).json({
        error: {
          code: "RATE_LIMITED",
          message:
            message ?? "Too many messages. Please try again in a few minutes.",
        },
      });
    },
  });
}
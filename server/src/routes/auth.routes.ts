import { Router } from "express";
import rateLimit from "express-rate-limit";
import { randomBytes } from "node:crypto";

import { env } from "../config/env";
import { ApiError } from "../lib/api-error";
import { asyncHandler } from "../lib/async-handler";
import {
  clearRefreshCookie,
  getRefreshCookie,
  setRefreshCookie,
  sessionMeta,
} from "../lib/cookies";
import { logger } from "../lib/logger";
import { toAgentProfileDto, toUserDto } from "../lib/serializers";
import { requireAuth } from "../middleware/auth";
import { AgentProfileModel } from "../models/agent-profile.model";
import { PasswordResetTokenModel } from "../models/password-reset-token.model";
import { UserModel, type UserDocument } from "../models/user.model";
import {
  createSession,
  hashPassword,
  hashToken,
  revokeAllSessions,
  revokeSession,
  rotateSession,
  verifyPassword,
} from "../services/auth.service";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "../validation/auth.schemas";

export const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
});

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
});

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

async function profileFor(user: UserDocument) {
  if (user.role !== "agent") return null;

  const profile = await AgentProfileModel.findOne({ user: user._id });
  return profile ? toAgentProfileDto(profile) : null;
}

authRouter.post(
  "/register",
  registerLimiter,
  asyncHandler(async (req, res) => {
    const payload = registerSchema.parse(req.body);

    const existing = await UserModel.findOne({ email: payload.email }).select("_id");

    if (existing) {
      throw ApiError.conflict("An account with that email already exists");
    }

    const user = await UserModel.create({
      name: payload.name,
      email: payload.email,
      phone: payload.phone || undefined,
      passwordHash: await hashPassword(payload.password),
      role: payload.role,
      status: "active",
    });

    let agentProfile = null;

    if (payload.role === "agent") {
      agentProfile = await AgentProfileModel.create({
        user: user._id,
        agency: payload.agency,
        licenseNumber: payload.licenseNumber || undefined,
      });
    }

    const session = await createSession(user, sessionMeta(req));
    setRefreshCookie(res, session.refreshToken, session.refreshExpiresAt);

    res.status(201).json({
      data: {
        user: toUserDto(user),
        agentProfile: agentProfile ? toAgentProfileDto(agentProfile) : null,
        accessToken: session.accessToken,
      },
    });
  }),
);

authRouter.post(
  "/login",
  loginLimiter,
  asyncHandler(async (req, res) => {
    const payload = loginSchema.parse(req.body);

    const user = await UserModel.findOne({ email: payload.email }).select("+passwordHash");

    if (!user || !(await verifyPassword(payload.password, user.passwordHash))) {
      throw ApiError.unauthorized("Email or password is incorrect");
    }

    if (user.status === "suspended") {
      throw ApiError.forbidden("This account has been suspended. Contact support for help.");
    }

    user.lastLoginAt = new Date();
    await user.save();

    const session = await createSession(user, sessionMeta(req));
    setRefreshCookie(res, session.refreshToken, session.refreshExpiresAt);

    res.json({
      data: {
        user: toUserDto(user),
        agentProfile: await profileFor(user),
        accessToken: session.accessToken,
      },
    });
  }),
);

authRouter.post(
  "/refresh",
  authLimiter,
  asyncHandler(async (req, res) => {
    const rawToken = getRefreshCookie(req);

    if (!rawToken) {
      res.status(204).end();
      return;
    }

    try {
      const { user, session } = await rotateSession(rawToken, sessionMeta(req));
      setRefreshCookie(res, session.refreshToken, session.refreshExpiresAt);

      res.json({
        data: {
          user: toUserDto(user),
          agentProfile: await profileFor(user),
          accessToken: session.accessToken,
        },
      });
    } catch (error) {
      clearRefreshCookie(res);
      throw error;
    }
  }),
);

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    await revokeSession(getRefreshCookie(req));
    clearRefreshCookie(res);
    res.status(204).end();
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await UserModel.findById(req.auth?.id);

    if (!user) {
      throw ApiError.unauthorized("Your session has expired. Please sign in again.");
    }

    res.json({
      data: {
        user: toUserDto(user),
        agentProfile: await profileFor(user),
      },
    });
  }),
);

authRouter.post(
  "/forgot-password",
  resetLimiter,
  asyncHandler(async (req, res) => {
    const { email } = forgotPasswordSchema.parse(req.body);
    const user = await UserModel.findOne({ email }).select("_id email");
    const message = "If an account exists for that email, a reset link is on its way.";

    if (!user) {
      res.json({ data: { message } });
      return;
    }

    const token = randomBytes(32).toString("base64url");

    await PasswordResetTokenModel.create({
      user: user._id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    });

    const resetUrl = `${env.CORS_ORIGIN.split(",")[0]?.trim()}/reset-password?token=${token}`;
    logger.info({ email: user.email, resetUrl }, "Password reset requested");

    res.json({
      data: {
        message,
        ...(env.NODE_ENV !== "production" ? { resetToken: token } : {}),
      },
    });
  }),
);

authRouter.post(
  "/reset-password",
  resetLimiter,
  asyncHandler(async (req, res) => {
    const { token, password } = resetPasswordSchema.parse(req.body);

    const record = await PasswordResetTokenModel.findOne({
      tokenHash: hashToken(token),
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!record) {
      throw ApiError.badRequest("This reset link is invalid or has expired");
    }

    const user = await UserModel.findById(record.user).select("+passwordHash");

    if (!user) {
      throw ApiError.badRequest("This reset link is invalid or has expired");
    }

    user.passwordHash = await hashPassword(password);
    await user.save();

    record.usedAt = new Date();
    await record.save();

    await revokeAllSessions(user.id);
    clearRefreshCookie(res);

    res.json({
      data: { message: "Password updated. Sign in with your new password." },
    });
  }),
);
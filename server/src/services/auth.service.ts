import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";

import { env } from "../config/env";
import { accessSecret, refreshTokenTtlDays } from "../config/secrets";
import { ApiError } from "../lib/api-error";
import { RefreshTokenModel } from "../models/refresh-token.model";
import { UserModel, type UserDocument } from "../models/user.model";

export interface SessionMeta {
  userAgent?: string;
  ip?: string;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

export interface AccessPayload {
  sub: string;
  role: string;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function signAccessToken(user: UserDocument): string {
  return jwt.sign({ role: user.role }, accessSecret(), {
    subject: user.id,
    expiresIn: env.ACCESS_TOKEN_TTL as SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessPayload {
  try {
    const payload = jwt.verify(token, accessSecret()) as JwtPayload;

    if (!payload.sub || typeof payload.role !== "string") {
      throw new Error("Malformed token");
    }

    return { sub: payload.sub, role: payload.role };
  } catch {
    throw ApiError.unauthorized("Your session has expired. Please sign in again.");
  }
}

export async function createSession(user: UserDocument, meta: SessionMeta): Promise<SessionTokens> {
  const refreshToken = randomBytes(48).toString("base64url");
  const refreshExpiresAt = new Date(Date.now() + refreshTokenTtlDays() * 86_400_000);

  await RefreshTokenModel.create({
    user: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt: refreshExpiresAt,
    userAgent: meta.userAgent,
    ip: meta.ip,
  });

  return {
    accessToken: signAccessToken(user),
    refreshToken,
    refreshExpiresAt,
  };
}

export async function rotateSession(
  rawToken: string,
  meta: SessionMeta,
): Promise<{ user: UserDocument; session: SessionTokens }> {
  const existing = await RefreshTokenModel.findOne({
    tokenHash: hashToken(rawToken),
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!existing) {
    throw ApiError.unauthorized("Session expired. Please sign in again.");
  }

  existing.revokedAt = new Date();
  await existing.save();

  const user = await UserModel.findById(existing.user);

  if (!user) {
    throw ApiError.unauthorized("Session expired. Please sign in again.");
  }

  if (user.status === "suspended") {
    throw ApiError.forbidden("This account has been suspended.");
  }

  const session = await createSession(user, meta);
  return { user, session };
}

export async function revokeSession(rawToken?: string): Promise<void> {
  if (!rawToken) return;

  await RefreshTokenModel.updateOne(
    { tokenHash: hashToken(rawToken), revokedAt: null },
    { revokedAt: new Date() },
  );
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await RefreshTokenModel.updateMany({ user: userId, revokedAt: null }, { revokedAt: new Date() });
}
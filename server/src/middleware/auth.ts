import type { Request, RequestHandler } from "express";

import { ApiError } from "../lib/api-error";
import { UserModel, type UserRole } from "../models/user.model";
import { verifyAccessToken } from "../services/auth.service";

export interface AuthContext {
  id: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

async function resolveAuth(req: Request): Promise<AuthContext> {
  const header = req.get("authorization");

  if (!header?.startsWith("Bearer ")) {
    throw ApiError.unauthorized();
  }

  const payload = verifyAccessToken(header.slice("Bearer ".length).trim());
  const user = await UserModel.findById(payload.sub).select("role status");

  if (!user) {
    throw ApiError.unauthorized("Your session has expired. Please sign in again.");
  }

  if (user.status === "suspended") {
    throw ApiError.forbidden("This account has been suspended.");
  }

  return { id: user.id, role: user.role };
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    req.auth = await resolveAuth(req);
    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuth: RequestHandler = async (req, _res, next) => {
  if (!req.get("authorization")) {
    next();
    return;
  }

  try {
    req.auth = await resolveAuth(req);
    next();
  } catch (error) {
    next(error);
  }
};

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) {
      next(ApiError.unauthorized());
      return;
    }

    if (!roles.includes(req.auth.role)) {
      next(ApiError.forbidden("Your account does not have access to this area"));
      return;
    }

    next();
  };
}
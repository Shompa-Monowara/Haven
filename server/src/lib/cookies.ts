import type { Request, Response } from "express";

import { isProduction } from "../config/env";

export const REFRESH_COOKIE = "haven_refresh";

const cookieBase = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  path: "/api/auth",
};

export function setRefreshCookie(res: Response, token: string, expires: Date): void {
  res.cookie(REFRESH_COOKIE, token, { ...cookieBase, expires });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, cookieBase);
}

export function getRefreshCookie(req: Request): string | undefined {
  const value = req.cookies?.[REFRESH_COOKIE];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function sessionMeta(req: Request) {
  return {
    userAgent: req.get("user-agent")?.slice(0, 400),
    ip: req.ip,
  };
}
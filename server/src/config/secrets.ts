import { env, isProduction } from "../config/env";

const DEV_ACCESS_SECRET = "haven-development-access-secret-please-change";
const DEV_REFRESH_SECRET = "haven-development-refresh-secret-please-change";

export function accessSecret(): string {
  const secret = env.JWT_ACCESS_SECRET ?? (isProduction ? undefined : DEV_ACCESS_SECRET);
  if (!secret) throw new Error("JWT_ACCESS_SECRET is required in production");
  return secret;
}

export function refreshSecret(): string {
  const secret = env.JWT_REFRESH_SECRET ?? (isProduction ? undefined : DEV_REFRESH_SECRET);
  if (!secret) throw new Error("JWT_REFRESH_SECRET is required in production");
  return secret;
}

export function refreshTokenTtlDays(): number {
  return env.REFRESH_TOKEN_TTL_DAYS;
}
import { Types } from "mongoose";

import { env } from "../config/env";
import { logger } from "../lib/logger";
import { storageProvider } from "../lib/uploads";
import { AuditLogModel } from "../models/audit-log.model";
import {
  PlatformSettingsModel,
  type PlatformSettingsDocument,
} from "../models/platform-settings.model";

export const PLATFORM_SETTINGS_KEY = "platform";
const CACHE_TTL_MS = 30_000;

export interface PlatformSettingsValues {
  id: string | null;
  review: { standardReviewBusinessDays: number };
  notifications: {
    listingDecisionEmails: boolean;
    offlineMessageEmails: boolean;
    savedSearchDigests: boolean;
  };
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface PlatformSettingsPatch {
  review?: { standardReviewBusinessDays?: number };
  notifications?: {
    listingDecisionEmails?: boolean;
    offlineMessageEmails?: boolean;
    savedSearchDigests?: boolean;
  };
}

export const DEFAULT_PLATFORM_SETTINGS = {
  review: { standardReviewBusinessDays: 1 },
  notifications: {
    listingDecisionEmails: true,
    offlineMessageEmails: true,
    savedSearchDigests: true,
  },
} as const;

/**
 * 30-second in-memory cache so email paths do not hit the database on every
 * message. An update invalidates this process's cache immediately, but other
 * server instances keep stale values for up to 30 seconds. These are
 * best-effort email preferences, so that delay is acceptable.
 */
let cache: { value: PlatformSettingsValues; expiresAt: number } | null = null;

export function invalidatePlatformSettingsCache(): void {
  cache = null;
}

function defaultValues(): PlatformSettingsValues {
  return {
    id: null,
    review: { ...DEFAULT_PLATFORM_SETTINGS.review },
    notifications: { ...DEFAULT_PLATFORM_SETTINGS.notifications },
    updatedAt: null,
    updatedBy: null,
  };
}

function toValues(doc: PlatformSettingsDocument): PlatformSettingsValues {
  return {
    id: doc.id,
    review: {
      standardReviewBusinessDays:
        doc.review?.standardReviewBusinessDays ??
        DEFAULT_PLATFORM_SETTINGS.review.standardReviewBusinessDays,
    },
    notifications: {
      listingDecisionEmails:
        doc.notifications?.listingDecisionEmails ??
        DEFAULT_PLATFORM_SETTINGS.notifications.listingDecisionEmails,
      offlineMessageEmails:
        doc.notifications?.offlineMessageEmails ??
        DEFAULT_PLATFORM_SETTINGS.notifications.offlineMessageEmails,
      savedSearchDigests:
        doc.notifications?.savedSearchDigests ??
        DEFAULT_PLATFORM_SETTINGS.notifications.savedSearchDigests,
    },
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
    updatedBy: doc.updatedBy ? doc.updatedBy.toString() : null,
  };
}

async function loadOrCreate(): Promise<PlatformSettingsDocument> {
  const existing = await PlatformSettingsModel.findOne({ key: PLATFORM_SETTINGS_KEY });
  if (existing) return existing;

  try {
    const created = await PlatformSettingsModel.findOneAndUpdate(
      { key: PLATFORM_SETTINGS_KEY },
      {
        $setOnInsert: {
          key: PLATFORM_SETTINGS_KEY,
          review: { ...DEFAULT_PLATFORM_SETTINGS.review },
          notifications: { ...DEFAULT_PLATFORM_SETTINGS.notifications },
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    if (!created) throw new Error("Platform settings could not be initialized");
    return created;
  } catch (error) {
    const raced = await PlatformSettingsModel.findOne({ key: PLATFORM_SETTINGS_KEY });
    if (raced) return raced;
    throw error;
  }
}

export async function getPlatformSettings(): Promise<PlatformSettingsValues> {
  if (cache && cache.expiresAt > Date.now()) return cache.value;

  try {
    const doc = await loadOrCreate();
    const value = toValues(doc);
    cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
    return value;
  } catch (error) {
    logger.error({ err: error }, "Falling back to default platform settings");
    return defaultValues();
  }
}

export async function updatePlatformSettings(
  actorId: string,
  patch: PlatformSettingsPatch,
  ip?: string,
): Promise<PlatformSettingsValues> {
  const doc = await loadOrCreate();

  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};

  const currentDays =
    doc.review?.standardReviewBusinessDays ??
    DEFAULT_PLATFORM_SETTINGS.review.standardReviewBusinessDays;
  const nextDays = patch.review?.standardReviewBusinessDays;
  if (nextDays !== undefined && nextDays !== currentDays) {
    doc.set("review.standardReviewBusinessDays", nextDays);
    before.review = { standardReviewBusinessDays: currentDays };
    after.review = { standardReviewBusinessDays: nextDays };
  }

  const currentNotifications = {
    listingDecisionEmails:
      doc.notifications?.listingDecisionEmails ??
      DEFAULT_PLATFORM_SETTINGS.notifications.listingDecisionEmails,
    offlineMessageEmails:
      doc.notifications?.offlineMessageEmails ??
      DEFAULT_PLATFORM_SETTINGS.notifications.offlineMessageEmails,
    savedSearchDigests:
      doc.notifications?.savedSearchDigests ??
      DEFAULT_PLATFORM_SETTINGS.notifications.savedSearchDigests,
  };

  const beforeNotifications: Record<string, boolean> = {};
  const afterNotifications: Record<string, boolean> = {};
  for (const key of [
    "listingDecisionEmails",
    "offlineMessageEmails",
    "savedSearchDigests",
  ] as const) {
    const next = patch.notifications?.[key];
    if (next !== undefined && next !== currentNotifications[key]) {
      doc.set(`notifications.${key}`, next);
      beforeNotifications[key] = currentNotifications[key];
      afterNotifications[key] = next;
    }
  }
  if (Object.keys(beforeNotifications).length > 0) {
    before.notifications = beforeNotifications;
    after.notifications = afterNotifications;
  }

  doc.updatedBy = new Types.ObjectId(actorId);
  await doc.save();

  await AuditLogModel.create({
    actor: actorId,
    action: "settings.update",
    entity: "PlatformSettings",
    entityId: doc._id,
    before,
    after,
    ip,
  });

  invalidatePlatformSettingsCache();
  return toValues(doc);
}

export function getSystemStatus() {
  return {
    email: { configured: Boolean(env.SMTP_HOST) },
    storage: { provider: storageProvider },
    environment: env.NODE_ENV,
  };
}
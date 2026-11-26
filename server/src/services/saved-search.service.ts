import { env } from "../config/env";
import { ApiError } from "../lib/api-error";
import { sendSavedSearchDigest } from "../lib/email";
import { logger } from "../lib/logger";
import { PropertyModel, type PropertyDocument } from "../models/property.model";
import { SavedSearchModel, type SavedSearchDocument } from "../models/saved-search.model";
import { UserModel } from "../models/user.model";
import { propertyListQuerySchema } from "../validation/property.schemas";
import { buildPublicPropertyFilter } from "../lib/property-filter";
import { createNotification } from "./notification.service";

const DIGEST_INTERVAL_MS: Record<string, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

export interface SavedSearchDto {
  id: string;
  name: string;
  criteria: string;
  frequency: string;
  emailAlerts: boolean;
  inAppAlerts: boolean;
  matchCount: number;
  newMatches: number;
  lastRunAt: string | Date | null;
  lastDigestAt: string | Date | null;
  createdAt: string | Date;
}

function parseCriteria(criteria: string) {
  const params = new URLSearchParams(criteria);
  params.delete("page");
  params.delete("view");
  params.delete("sort");
  params.set("limit", "1");

  try {
    return propertyListQuerySchema.parse(Object.fromEntries(params));
  } catch {
    throw ApiError.badRequest("These search criteria are not valid");
  }
}

async function countsFor(search: SavedSearchDocument) {
  const query = parseCriteria(search.criteria);
  const filter = buildPublicPropertyFilter(query);
  const since = search.lastRunAt ?? search.createdAt ?? new Date(0);

  const [matchCount, newMatches] = await Promise.all([
    PropertyModel.countDocuments(filter),
    PropertyModel.countDocuments({ ...filter, publishedAt: { $gt: since } }),
  ]);

  return { matchCount, newMatches };
}

async function toDto(search: SavedSearchDocument): Promise<SavedSearchDto> {
  const { matchCount, newMatches } = await countsFor(search);
  return {
    id: search.id,
    name: search.name,
    criteria: search.criteria,
    frequency: search.frequency,
    emailAlerts: search.emailAlerts,
    inAppAlerts: search.inAppAlerts,
    matchCount,
    newMatches,
    lastRunAt: search.lastRunAt ?? null,
    lastDigestAt: search.lastDigestAt ?? null,
    createdAt: search.createdAt,
  };
}

export async function listSavedSearches(userId: string) {
  const searches = await SavedSearchModel.find({ user: userId }).sort({ createdAt: -1 });
  return Promise.all(searches.map(toDto));
}

export async function createSavedSearch(
  userId: string,
  input: {
    name: string;
    criteria: string;
    frequency: "off" | "instant" | "daily" | "weekly";
    emailAlerts: boolean;
    inAppAlerts: boolean;
  },
) {
  parseCriteria(input.criteria);

  const search = await SavedSearchModel.create({
    user: userId,
    name: input.name,
    criteria: input.criteria,
    frequency: input.frequency,
    emailAlerts: input.emailAlerts,
    inAppAlerts: input.inAppAlerts,
  });

  return toDto(search);
}

export async function updateSavedSearch(
  userId: string,
  id: string,
  input: {
    name?: string;
    frequency?: "off" | "instant" | "daily" | "weekly";
    emailAlerts?: boolean;
    inAppAlerts?: boolean;
  },
) {
  const search = await SavedSearchModel.findOne({ _id: id, user: userId });
  if (!search) throw ApiError.notFound("That saved search could not be found");

  if (input.name !== undefined) search.name = input.name;
  if (input.frequency !== undefined) search.frequency = input.frequency;
  if (input.emailAlerts !== undefined) search.emailAlerts = input.emailAlerts;
  if (input.inAppAlerts !== undefined) search.inAppAlerts = input.inAppAlerts;
  await search.save();

  return toDto(search);
}

export async function deleteSavedSearch(userId: string, id: string) {
  const result = await SavedSearchModel.deleteOne({ _id: id, user: userId });
  if (result.deletedCount === 0) throw ApiError.notFound("That saved search could not be found");
}

function isDigestDue(search: SavedSearchDocument) {
  const interval = DIGEST_INTERVAL_MS[search.frequency];
  if (!interval) return false;
  if (!search.lastRunAt) return true;
  return Date.now() - new Date(search.lastRunAt).getTime() >= interval;
}

/**
 * Runs saved-search digests that are due.
 *
 * Daily searches run at most once every 24 hours and weekly at most once every
 * 7 days. Instant searches are handled by `notifyInstantMatches` on approval.
 * `force` ignores the cadence (used by the admin trigger).
 */
export async function runSavedSearchDigests({ force = false }: { force?: boolean } = {}) {
  const candidates = await SavedSearchModel.find({ frequency: { $in: ["daily", "weekly"] } });
  const searches = force ? candidates : candidates.filter(isDigestDue);
  let emailsSent = 0;
  let totalMatches = 0;

  for (const search of searches) {
    const since = search.lastRunAt ?? search.createdAt ?? new Date(0);
    const filter = buildPublicPropertyFilter(parseCriteria(search.criteria));
    const newMatches = await PropertyModel.countDocuments({
      ...filter,
      publishedAt: { $gt: since },
    });

    totalMatches += newMatches;

    if (newMatches > 0 && (search.emailAlerts || search.inAppAlerts)) {
      const matches = await PropertyModel.find({
        ...filter,
        publishedAt: { $gt: since },
      })
        .sort({ publishedAt: -1 })
        .limit(3)
        .select("title slug price address.city");

      if (search.inAppAlerts) {
        await createNotification({
          user: search.user.toString(),
          type: "saved_search",
          title: `${newMatches} new ${newMatches === 1 ? "home" : "homes"} for "${search.name}"`,
          body: matches.map((match) => match.title).join(" · "),
          href: `/properties?${search.criteria}`,
        });
      }

      if (search.emailAlerts) {
        const user = await UserModel.findById(search.user).select("name email");

        if (user) {
          await sendSavedSearchDigest({
            to: user.email,
            userName: user.name,
            searchName: search.name,
            count: newMatches,
            matches: matches.map((match) => ({
              title: match.title,
              slug: match.slug,
              price: match.price,
              city: match.address?.city ?? null,
            })),
            searchUrl: `${env.CORS_ORIGIN}/properties?${search.criteria}`,
          });
          emailsSent += 1;
        }
      }
    }

    search.lastRunAt = new Date();
    if (newMatches > 0) search.lastDigestAt = new Date();
    await search.save();
  }

  logger.info(
    { processed: searches.length, emailsSent, totalMatches, forced: force },
    "Saved search digests run",
  );
  return { processed: searches.length, emailsSent, totalMatches };
}

/**
 * Notifies owners of instant searches when a listing is approved and matches
 * their criteria. Each listing notifies a given search only once.
 */
export async function notifyInstantMatches(property: PropertyDocument) {
  const searches = await SavedSearchModel.find({
    frequency: "instant",
    inAppAlerts: true,
  });

  for (const search of searches) {
    const notified = (search.lastNotifiedPropertyIds ?? []).some(
      (id) => id.toString() === property.id,
    );
    if (notified) continue;

    let filter: Record<string, unknown>;
    try {
      filter = buildPublicPropertyFilter(parseCriteria(search.criteria));
    } catch {
      continue;
    }

    const matches = await PropertyModel.countDocuments({ ...filter, _id: property._id });
    if (!matches) continue;

    await createNotification({
      user: search.user.toString(),
      type: "saved_search",
      title: `New match for "${search.name}"`,
      body: property.title,
      href: `/properties/${property.slug}`,
    });

    search.lastNotifiedPropertyIds = [
      ...(search.lastNotifiedPropertyIds ?? []),
      property._id,
    ].slice(-200);
    await search.save();
  }
}
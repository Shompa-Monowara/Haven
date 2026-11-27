import type { Request } from "express";
import { Types } from "mongoose";

import { env } from "../config/env";
import { ApiError } from "../lib/api-error";
import { sendListingDecisionEmail } from "../lib/email";
import { buildPublicPropertyFilter, escapeRegex } from "../lib/property-filter";
import { deleteUploads } from "../lib/uploads";
import { createNotification, createNotifications } from "./notification.service";
import { notifyInstantMatches } from "./saved-search.service";
import { getPlatformSettings } from "./settings.service";

export { buildPublicPropertyFilter };
import { toAgentSummary, toPropertyDetailDto, toPropertySummaryDto } from "../lib/property-serializers";
import { AgentProfileModel } from "../models/agent-profile.model";
import { AuditLogModel } from "../models/audit-log.model";
import { PropertyModel, type PropertyDocument, type PropertyStatus } from "../models/property.model";
import { UserModel } from "../models/user.model";
import type {
  AdminDecisionInput,
  CreatePropertyInput,
  PropertyListQuery,
  UpdatePropertyInput,
} from "../validation/property.schemas";

interface Viewer {
  id: string;
  role: "buyer" | "agent" | "admin";
}

async function loadAgentSummaries(agentIds: string[]) {
  const unique = [...new Set(agentIds)];
  if (!unique.length) return new Map<string, ReturnType<typeof toAgentSummary>>();

  const [users, profiles] = await Promise.all([
    UserModel.find({ _id: { $in: unique } }).select("name avatar"),
    AgentProfileModel.find({ user: { $in: unique } }).select(
      "user agency verified responseTimeMinutes createdAt",
    ),
  ]);

  const profileMap = new Map(profiles.map((profile) => [profile.user.toString(), profile]));

  return new Map(
    users.map((user) => [user.id, toAgentSummary(user, profileMap.get(user.id) ?? null)]),
  );
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function uniqueSlug(title: string, city?: string | null): Promise<string> {
  const base = slugify(`${title} ${city ?? ""}`) || `listing-${Date.now()}`;
  const existing = await PropertyModel.exists({ slug: base });

  if (!existing) return base;

  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${base}-${suffix}`;
    if (!(await PropertyModel.exists({ slug: candidate }))) return candidate;
  }

  return `${base}-${Date.now().toString(36)}`;
}

function normalizeImages(
  images: NonNullable<CreatePropertyInput["images"]>,
  fallbackAlt: string,
) {
  const sorted = [...images].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const coverIndex = Math.max(
    0,
    sorted.findIndex((image) => image.isCover),
  );

  return sorted.map((image, index) => ({
    url: image.url,
    publicId: image.publicId,
    alt: image.alt?.trim() || fallbackAlt,
    isCover: index === coverIndex,
    order: index,
  }));
}

function normalizeLocation(location: CreatePropertyInput["location"]) {
  if (!location) return undefined;
  return { type: "Point" as const, coordinates: [location.lng, location.lat] };
}

function materialSnapshot(property: PropertyDocument) {
  return {
    title: property.title,
    description: (property.description ?? "").slice(0, 300),
    listingType: property.listingType,
    propertyType: property.propertyType,
    price: property.price,
    sizeSqft: property.sizeSqft,
    address: {
      street: property.address?.street ?? "",
      city: property.address?.city ?? "",
      state: property.address?.state ?? "",
      zip: property.address?.zip ?? "",
    },
    images: property.images.map((image) => image.url),
  };
}

function hasMaterialChange(property: PropertyDocument, input: UpdatePropertyInput): boolean {
  if (input.title !== undefined && input.title !== property.title) return true;
  if (input.listingType !== undefined && input.listingType !== property.listingType) return true;
  if (input.propertyType !== undefined && input.propertyType !== property.propertyType) return true;
  if (input.price !== undefined && input.price !== property.price) return true;
  if (input.sizeSqft !== undefined && input.sizeSqft !== property.sizeSqft) return true;

  if (input.address) {
    const current = property.address;
    const changed =
      (input.address.street !== undefined && input.address.street !== current?.street) ||
      (input.address.city !== undefined && input.address.city !== current?.city) ||
      (input.address.state !== undefined && input.address.state !== current?.state) ||
      (input.address.zip !== undefined && input.address.zip !== current?.zip) ||
      (input.address.neighborhood !== undefined && input.address.neighborhood !== current?.neighborhood);
    if (changed) return true;
  }

  if (input.images) {
    const next = input.images.map((image) => image.url).join("|");
    const current = property.images.map((image) => image.url).join("|");
    if (next !== current) return true;
  }

  return false;
}

function assertOwner(property: PropertyDocument, viewer: Viewer) {
  if (viewer.role === "admin") return;
  if (property.agent.toString() !== viewer.id) {
    throw ApiError.forbidden("You can only manage your own listings");
  }
}

function requireCompleteForSubmit(property: PropertyDocument) {
  const issues: Array<{ path: string; message: string }> = [];

  if (!property.title || property.title.trim().length < 5) {
    issues.push({ path: "title", message: "Add a title of at least 5 characters" });
  }
  if ((property.description ?? "").trim().length < 40) {
    issues.push({ path: "description", message: "Write at least 40 characters of description" });
  }
  if (!property.price || property.price <= 0) {
    issues.push({ path: "price", message: "Enter a price" });
  }
  if (property.listingType === "rent" && !property.rentPeriod) {
    issues.push({ path: "rentPeriod", message: "Choose a rent period" });
  }
  if (!property.sizeSqft || property.sizeSqft <= 0) {
    issues.push({ path: "sizeSqft", message: "Enter the property size" });
  }
  if (!property.address?.street || !property.address?.city || !property.address?.state || !property.address?.zip) {
    issues.push({ path: "address", message: "Complete the street, city, state, and ZIP code" });
  }
  if (!property.location?.coordinates || property.location.coordinates.length !== 2) {
    issues.push({ path: "location", message: "Set the map pin for this property" });
  }
  if (property.images.length < 3) {
    issues.push({ path: "images", message: "Upload at least 3 photos before submitting" });
  }

  if (issues.length) {
    throw ApiError.badRequest("This listing is not ready for review yet", issues);
  }
}

export async function createDraft(agentId: string, input: CreatePropertyInput) {
  const coverAlt = input.title;
  const property = await PropertyModel.create({
    title: input.title,
    slug: await uniqueSlug(input.title, input.address?.city),
    description: input.description ?? "",
    listingType: input.listingType,
    propertyType: input.propertyType,
    price: input.price ?? 0,
    rentPeriod: input.rentPeriod ?? undefined,
    beds: input.beds ?? 0,
    baths: input.baths ?? 0,
    garages: input.garages ?? 0,
    sizeSqft: input.sizeSqft ?? 0,
    lotSizeSqft: input.lotSizeSqft ?? undefined,
    yearBuilt: input.yearBuilt ?? undefined,
    address: input.address ?? { country: "United States" },
    location: normalizeLocation(input.location),
    amenities: input.amenities ?? [],
    images: normalizeImages(input.images ?? [], coverAlt),
    agent: agentId,
    status: "draft",
  });

  return property;
}

export async function updateProperty(
  property: PropertyDocument,
  input: UpdatePropertyInput,
  viewer: Viewer,
  request: Request,
) {
  assertOwner(property, viewer);

  const isAdmin = viewer.role === "admin";

  if (!isAdmin) {
    if (property.status === "pending") {
      throw ApiError.conflict("This listing is under review and cannot be edited right now");
    }
    if (property.status === "archived") {
      throw ApiError.conflict("Archived listings cannot be edited. Restore it first.");
    }
  }

  const before = materialSnapshot(property);
  // Track both IDs and URLs so deletion works for Cloudinary (publicId) and
  // legacy/imported images that only have a URL.
  const previousImageItems = property.images
    .flatMap((image) => [image.publicId, image.url])
    .filter((value): value is string => Boolean(value));
  const material = hasMaterialChange(property, input);
  const descriptionChanged =
    input.description !== undefined && input.description !== property.description;

  if (input.title !== undefined) property.title = input.title;
  if (input.description !== undefined) property.description = input.description;
  if (input.listingType !== undefined) property.listingType = input.listingType;
  if (input.propertyType !== undefined) property.propertyType = input.propertyType;
  if (input.price !== undefined) property.price = input.price;
  if (input.rentPeriod !== undefined) property.rentPeriod = input.rentPeriod ?? undefined;
  if (input.beds !== undefined) property.beds = input.beds;
  if (input.baths !== undefined) property.baths = input.baths;
  if (input.garages !== undefined) property.garages = input.garages;
  if (input.sizeSqft !== undefined) property.sizeSqft = input.sizeSqft;
  if (input.lotSizeSqft !== undefined) property.lotSizeSqft = input.lotSizeSqft ?? undefined;
  if (input.yearBuilt !== undefined) property.yearBuilt = input.yearBuilt ?? undefined;
  if (input.address !== undefined) {
    property.address = {
      street: input.address.street ?? property.address?.street,
      city: input.address.city ?? property.address?.city,
      state: input.address.state ?? property.address?.state,
      zip: input.address.zip ?? property.address?.zip,
      country: input.address.country ?? property.address?.country ?? "United States",
      neighborhood: input.address.neighborhood ?? property.address?.neighborhood,
    };
  }
  if (input.location !== undefined) {
    property.location = normalizeLocation(input.location) as PropertyDocument["location"];
  }
  if (input.amenities !== undefined) property.amenities = input.amenities;
  if (input.images !== undefined) {
    property.images = normalizeImages(input.images, property.title) as never;
  }
  if (isAdmin && input.featured !== undefined) property.featured = input.featured;

  if (material && property.status === "approved" && !isAdmin) {
    property.status = "pending";
    property.submittedAt = new Date();
    property.reviewedAt = undefined;
    property.reviewedBy = undefined;
    property.rejectionReason = undefined;
  }

  await property.save();

  if (input.images !== undefined) {
    const currentItems = new Set(
      property.images
        .flatMap((image) => [image.publicId, image.url])
        .filter((value): value is string => Boolean(value)),
    );
    await deleteUploads(previousImageItems.filter((item) => !currentItems.has(item)));
  }

  if (material || descriptionChanged) {
    await AuditLogModel.create({
      actor: viewer.id,
      action: "property.updated",
      entity: "Property",
      entityId: property._id,
      before,
      after: materialSnapshot(property),
      ip: request.ip,
    });
  }

  return property;
}

export async function submitProperty(property: PropertyDocument, viewer: Viewer, request: Request) {
  assertOwner(property, viewer);

  if (!["draft", "changes_requested", "rejected"].includes(property.status)) {
    throw ApiError.conflict("Only drafts, changes requested, or rejected listings can be submitted");
  }

  requireCompleteForSubmit(property);

  const previous = property.status;
  property.status = "pending";
  property.submittedAt = new Date();
  property.rejectionReason = undefined;
  await property.save();

  await AuditLogModel.create({
    actor: viewer.id,
    action: "property.submitted",
    entity: "Property",
    entityId: property._id,
    before: { status: previous },
    after: { status: property.status },
    ip: request.ip,
  });

  const admins = await UserModel.find({ role: "admin", status: "active" }).select("_id");
  await createNotifications(
    admins.map((admin) => ({
      user: admin.id,
      type: "system" as const,
      title: "Listing submitted for review",
      body: `${property.title} is ready for review.`,
      href: "/admin/approvals",
    })),
  );

  return property;
}

export async function archiveProperty(property: PropertyDocument, viewer: Viewer, request: Request) {
  assertOwner(property, viewer);

  if (property.status === "archived") {
    throw ApiError.conflict("This listing is already archived");
  }
  if (property.status !== "approved" && viewer.role !== "admin") {
    throw ApiError.conflict("Only approved listings can be archived");
  }

  const previous = property.status;
  property.status = "archived";
  property.archivedAt = new Date();
  await property.save();

  await AuditLogModel.create({
    actor: viewer.id,
    action: "property.archived",
    entity: "Property",
    entityId: property._id,
    before: { status: previous },
    after: { status: property.status },
    ip: request.ip,
  });

  return property;
}

export async function restoreProperty(
  property: PropertyDocument,
  adminId: string,
  request: Request,
) {
  if (property.status !== "archived") {
    throw ApiError.conflict("Only archived listings can be restored");
  }

  property.status = property.publishedAt ? "approved" : "pending";
  property.archivedAt = undefined;
  await property.save();

  await AuditLogModel.create({
    actor: adminId,
    action: "property.restored",
    entity: "Property",
    entityId: property._id,
    before: { status: "archived" },
    after: { status: property.status },
    ip: request.ip,
  });

  return property;
}

export async function bulkApproveProperties(
  ids: string[],
  adminId: string,
  request: Request,
) {
  const properties = await PropertyModel.find({ _id: { $in: ids }, status: "pending" });

  for (const property of properties) {
    await decideProperty(property, adminId, { status: "approved" }, request);
  }

  return { approved: properties.length };
}

export async function deleteDraft(property: PropertyDocument, viewer: Viewer) {
  assertOwner(property, viewer);

  if (property.status !== "draft") {
    throw ApiError.conflict("Only drafts can be deleted");
  }

  const imageItems = property.images
    .flatMap((image) => [image.publicId, image.url])
    .filter((value): value is string => Boolean(value));
  await property.deleteOne();
  await deleteUploads(imageItems);
}

export async function decideProperty(
  property: PropertyDocument,
  adminId: string,
  input: AdminDecisionInput,
  request: Request,
) {
  if (property.status !== "pending") {
    throw ApiError.conflict("Only listings in review can receive a decision");
  }

  const previous = property.status;
  property.status = input.status;
  property.reviewedBy = new Types.ObjectId(adminId);
  property.reviewedAt = new Date();

  if (input.status === "approved") {
    property.publishedAt = property.publishedAt ?? new Date();
    property.rejectionReason = undefined;
    if (input.featured !== undefined) property.featured = input.featured;
  } else {
    property.rejectionReason = {
      category: input.reasonCategory,
      note: input.note,
    };
  }

  await property.save();

  await AuditLogModel.create({
    actor: adminId,
    action: `property.${input.status}`,
    entity: "Property",
    entityId: property._id,
    before: { status: previous },
    after: { status: property.status },
    reason: input.reasonCategory ? { category: input.reasonCategory, note: input.note } : undefined,
    ip: request.ip,
  });

  const agent = await UserModel.findById(property.agent).select("name email");
  if (agent) {
    const decisionTitle =
      input.status === "approved"
        ? "Listing approved"
        : input.status === "changes_requested"
          ? "Changes requested"
          : "Listing rejected";
    const decisionBody =
      input.status === "approved"
        ? `${property.title} is now live in search.`
        : `${property.title} needs attention before it can be published.${input.note ? ` ${input.note}` : ""}`;

    await createNotification({
      user: agent.id,
      type: "listing_decision",
      title: decisionTitle,
      body: decisionBody,
      href:
        input.status === "approved"
          ? `/properties/${property.slug}`
          : `/agent/listings/${property.id}/edit`,
    });

    const settings = await getPlatformSettings();
    if (settings.notifications.listingDecisionEmails) {
      void sendListingDecisionEmail({
        to: agent.email,
        agentName: agent.name,
        listingTitle: property.title,
        decision: input.status,
        reason: input.reasonCategory,
        note: input.note,
        listingUrl: `${env.CORS_ORIGIN}/properties/${property.slug}`,
        dashboardUrl: `${env.CORS_ORIGIN}/agent/listings`,
      });
    }
  }

  if (input.status === "approved") {
    await notifyInstantMatches(property);
  }

  return property;
}

export async function getPropertyBySlug(
  slug: string,
  viewer: Viewer | null,
  options: { countView?: boolean } = {},
) {
  const property = await PropertyModel.findOne({ slug }).exec();

  if (!property) throw ApiError.notFound("That listing could not be found");

  const isOwner = Boolean(viewer && property.agent.toString() === viewer.id);
  const isAdmin = viewer?.role === "admin";
  const isPublic =
    !property.hiddenBySuspension &&
    (property.status === "approved" || property.status === "archived");

  if (!isPublic && !isOwner && !isAdmin) {
    throw ApiError.notFound("That listing could not be found");
  }

  if (options.countView !== false && property.status === "approved" && !isOwner && !isAdmin) {
    await PropertyModel.updateOne({ _id: property._id }, { $inc: { views: 1 } });
    property.views += 1;
  }

  const summaries = await loadAgentSummaries([property.agent.toString()]);
  return {
    property,
    agent: summaries.get(property.agent.toString()) ?? null,
  };
}

export async function getOwnerProperty(id: string, viewer: Viewer) {
  const property = await PropertyModel.findById(id).exec();

  if (!property) throw ApiError.notFound("That listing could not be found");

  assertOwner(property, viewer);

  const summaries = await loadAgentSummaries([property.agent.toString()]);
  return {
    property,
    agent: summaries.get(property.agent.toString()) ?? null,
  };
}

export async function listPublicProperties(query: PropertyListQuery) {
  const useTextSearch = query.sort === "relevance" && Boolean(query.q?.trim());
  const filter = buildPublicPropertyFilter(query, { textSearch: useTextSearch });

  const sort: Record<string, 1 | -1 | { $meta: "textScore" }> = useTextSearch
    ? { score: { $meta: "textScore" } }
    : query.sort === "price_asc"
      ? { price: 1 }
      : query.sort === "price_desc"
        ? { price: -1 }
        : query.sort === "size_desc"
          ? { sizeSqft: -1 }
          : { publishedAt: -1, createdAt: -1 };

  const skip = (query.page - 1) * query.limit;

  const findQuery = PropertyModel.find(filter);
  if (useTextSearch) findQuery.select({ score: { $meta: "textScore" } });

  const [total, properties] = await Promise.all([
    PropertyModel.countDocuments(filter),
    findQuery.sort(sort).skip(skip).limit(query.limit).exec(),
  ]);

  const summaries = await loadAgentSummaries(properties.map((item) => item.agent.toString()));

  return {
    items: properties.map((property) =>
      toPropertySummaryDto(property, summaries.get(property.agent.toString()) ?? null),
    ),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function listAgentProperties(agentId: string) {
  const properties = await PropertyModel.find({ agent: agentId })
    .sort({ updatedAt: -1 })
    .exec();

  const summaries = await loadAgentSummaries([agentId]);

  return properties.map((property) =>
    toPropertySummaryDto(property, summaries.get(property.agent.toString()) ?? null),
  );
}

export async function listSimilarProperties(property: PropertyDocument, limit = 3) {
  const baseFilter: Record<string, unknown> = {
    status: "approved",
    hiddenBySuspension: { $ne: true },
    _id: { $ne: property._id },
  };

  if (property.address?.city) baseFilter["address.city"] = property.address.city;
  if (property.propertyType) baseFilter.propertyType = property.propertyType;

  let candidates = await PropertyModel.find({
    ...baseFilter,
    ...(property.price > 0
      ? { price: { $gte: property.price * 0.8, $lte: property.price * 1.2 } }
      : {}),
  })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .exec();

  if (candidates.length < limit) {
    const relaxCity = { ...baseFilter };
    delete relaxCity["address.city"];
    const relaxed = await PropertyModel.find({ _id: { $ne: property._id }, ...(relaxCity as object) })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .exec();

    const seen = new Set(candidates.map((item) => item.id));
    candidates = [...candidates, ...relaxed.filter((item) => !seen.has(item.id))].slice(0, limit);
  }

  const summaries = await loadAgentSummaries(candidates.map((item) => item.agent.toString()));

  return candidates.map((item) =>
    toPropertySummaryDto(item, summaries.get(item.agent.toString()) ?? null),
  );
}

export async function listAdminProperties(
  query: PropertyListQuery,
  status?: PropertyStatus,
  options: { agent?: string; from?: Date; to?: Date } = {},
) {
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (options.agent) filter.agent = options.agent;
  if (options.from || options.to) {
    const createdAt: Record<string, Date> = {};
    if (options.from) createdAt.$gte = options.from;
    if (options.to) createdAt.$lte = options.to;
    filter.createdAt = createdAt;
  }
  if (query.q) {
    const term = new RegExp(escapeRegex(query.q), "i");
    const matchingAgents = await UserModel.find({
      $or: [{ name: term }, { email: term }],
    })
      .select("_id")
      .limit(50);
    filter.$or = [
      { title: term },
      { "address.city": term },
      { agent: { $in: matchingAgents.map((agent) => agent._id) } },
    ];
  }

  const skip = (query.page - 1) * query.limit;
  const [total, properties] = await Promise.all([
    PropertyModel.countDocuments(filter),
    PropertyModel.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .exec(),
  ]);

  const summaries = await loadAgentSummaries(properties.map((item) => item.agent.toString()));

  return {
    items: properties.map((property) =>
      toPropertySummaryDto(property, summaries.get(property.agent.toString()) ?? null),
    ),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export function serializeDetail(
  property: PropertyDocument,
  agent: Parameters<typeof toPropertyDetailDto>[1],
) {
  return toPropertyDetailDto(property, agent);
}

export async function summarizeProperties(properties: PropertyDocument[]) {
  const summaries = await loadAgentSummaries(properties.map((property) => property.agent.toString()));
  return properties.map((property) =>
    toPropertySummaryDto(property, summaries.get(property.agent.toString()) ?? null),
  );
}

export async function listNeighborhoodCounts(city: string) {
  const rows = await PropertyModel.aggregate<{ _id: string; count: number }>([
    {
      $match: {
        status: "approved",
        hiddenBySuspension: { $ne: true },
        "address.city": new RegExp(`^${escapeRegex(city)}$`, "i"),
        "address.neighborhood": { $nin: [null, ""] },
      },
    },
    { $group: { _id: "$address.neighborhood", count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $limit: 80 },
  ]);

  return rows.map((row) => ({ neighborhood: row._id, count: row.count }));
}

export async function listCityCounts() {
  const rows = await PropertyModel.aggregate<{ _id: string; count: number }>([
    { $match: { status: "approved", hiddenBySuspension: { $ne: true }, "address.city": { $nin: [null, ""] } } },
    { $group: { _id: "$address.city", count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $limit: 100 },
  ]);

  return rows.map((row) => ({ city: row._id, count: row.count }));
}

export async function listPropertyTypeCounts() {
  const rows = await PropertyModel.aggregate<{ _id: string; count: number }>([
    {
      $match: {
        status: "approved",
        hiddenBySuspension: { $ne: true },
        propertyType: { $nin: [null, ""] },
      },
    },
    { $group: { _id: "$propertyType", count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
  ]);

  return rows.map((row) => ({ propertyType: row._id, count: row.count }));
}


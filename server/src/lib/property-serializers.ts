import type { AgentProfileDocument } from "../models/agent-profile.model";
import type { PropertyDocument } from "../models/property.model";
import type { UserDocument } from "../models/user.model";

export interface AgentSummary {
  id: string;
  name: string;
  avatar: { url: string } | null;
  agency: string | null;
  verified: boolean;
  responseTimeMinutes: number;
  memberSince: string | Date | undefined;
}

export function toAgentSummary(user: UserDocument, profile?: AgentProfileDocument | null): AgentSummary {
  return {
    id: user.id,
    name: user.name,
    avatar: user.avatar?.url ? { url: user.avatar.url } : null,
    agency: profile?.agency ?? null,
    verified: profile?.verified ?? false,
    responseTimeMinutes: profile?.responseTimeMinutes ?? 120,
    memberSince: profile?.createdAt,
  };
}

function orderedImages(images: PropertyDocument["images"]) {
  return [...images]
    .sort((a, b) => Number(b.isCover) - Number(a.isCover) || a.order - b.order)
    .map((image) => ({
      url: image.url,
      publicId: image.publicId,
      alt: image.alt ?? "",
      isCover: image.isCover,
      order: image.order,
    }));
}

function locationDto(location: PropertyDocument["location"]) {
  const coordinates = location?.coordinates;
  if (!coordinates || coordinates.length !== 2) return null;
  return { lat: coordinates[1], lng: coordinates[0] };
}

export function toPropertySummaryDto(property: PropertyDocument, agent: AgentSummary | null) {
  return {
    id: property.id,
    slug: property.slug,
    title: property.title,
    listingType: property.listingType,
    propertyType: property.propertyType,
    price: property.price,
    rentPeriod: property.rentPeriod ?? null,
    pricePerSqft: property.pricePerSqft ?? null,
    beds: property.beds,
    baths: property.baths,
    garages: property.garages,
    sizeSqft: property.sizeSqft,
    address: {
      street: property.address?.street ?? null,
      city: property.address?.city ?? null,
      state: property.address?.state ?? null,
      zip: property.address?.zip ?? null,
      country: property.address?.country ?? "United States",
      neighborhood: property.address?.neighborhood ?? null,
    },
    images: orderedImages(property.images),
    location: locationDto(property.location),
    status: property.status,
    featured: property.featured,
    views: property.views,
    agent,
    createdAt: property.createdAt,
    updatedAt: property.updatedAt,
    publishedAt: property.publishedAt ?? null,
    submittedAt: property.submittedAt ?? null,
    hiddenBySuspension: property.hiddenBySuspension ?? false,
  };
}

export function toPropertyDetailDto(property: PropertyDocument, agent: AgentSummary | null) {
  return {
    ...toPropertySummaryDto(property, agent),
    description: property.description ?? "",
    lotSizeSqft: property.lotSizeSqft ?? null,
    yearBuilt: property.yearBuilt ?? null,
    amenities: property.amenities,
    location: locationDto(property.location),
    rejectionReason: property.rejectionReason?.category
      ? {
          category: property.rejectionReason.category,
          note: property.rejectionReason.note ?? null,
        }
      : null,
    submittedAt: property.submittedAt ?? null,
    reviewedAt: property.reviewedAt ?? null,
    archivedAt: property.archivedAt ?? null,
  };
}
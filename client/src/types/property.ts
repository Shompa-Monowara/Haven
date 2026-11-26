export type ListingType = "sale" | "rent";

export type PropertyType =
  | "apartment"
  | "house"
  | "villa"
  | "studio"
  | "condo"
  | "office"
  | "shop";

export const PROPERTY_TYPES = [
  "apartment",
  "house",
  "villa",
  "studio",
  "condo",
  "office",
  "shop",
] as const;

export type PropertyStatus =
  | "draft"
  | "pending"
  | "approved"
  | "changes_requested"
  | "rejected"
  | "archived";

export type RentPeriod = "monthly" | "weekly" | "nightly";

export interface PropertyImage {
  url: string;
  publicId?: string;
  alt: string;
  isCover: boolean;
  order: number;
}

export interface PropertyAddress {
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string;
  neighborhood: string | null;
}

export interface PropertyAgent {
  id: string;
  name: string;
  avatar: { url: string } | null;
  agency: string | null;
  verified: boolean;
  responseTimeMinutes: number;
  memberSince?: string;
}

export interface PropertySummary {
  id: string;
  slug: string;
  title: string;
  listingType: ListingType;
  propertyType: PropertyType;
  price: number;
  rentPeriod: RentPeriod | null;
  pricePerSqft: number | null;
  beds: number;
  baths: number;
  garages: number;
  sizeSqft: number;
  address: PropertyAddress;
  images: PropertyImage[];
  location: { lat: number; lng: number } | null;
  status: PropertyStatus;
  featured: boolean;
  views: number;
  agent: PropertyAgent | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  submittedAt: string | null;
  hiddenBySuspension: boolean;
}

export interface PropertyDetail extends PropertySummary {
  description: string;
  lotSizeSqft: number | null;
  yearBuilt: number | null;
  amenities: string[];
  location: { lat: number; lng: number } | null;
  rejectionReason: { category: string; note: string | null } | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  archivedAt: string | null;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PropertyPage {
  data: PropertySummary[];
  meta: PageMeta;
}

export const propertyTypeLabels: Record<PropertyType, string> = {
  apartment: "Apartment",
  house: "House",
  villa: "Villa",
  studio: "Studio",
  condo: "Condo",
  office: "Office",
  shop: "Shop",
};

export const statusLabels: Record<PropertyStatus, string> = {
  draft: "Draft",
  pending: "Pending review",
  approved: "Approved",
  changes_requested: "Changes requested",
  rejected: "Rejected",
  archived: "Archived",
};

export const statusTones: Record<
  PropertyStatus,
  "neutral" | "pending" | "approved" | "rejected" | "changes" | "outline"
> = {
  draft: "neutral",
  pending: "pending",
  approved: "approved",
  changes_requested: "changes",
  rejected: "rejected",
  archived: "outline",
};

export const rejectionCategoryLabels: Record<string, string> = {
  incomplete_information: "Incomplete information",
  poor_photos: "Poor photos",
  inaccurate_pricing: "Inaccurate pricing",
  duplicate: "Duplicate listing",
  policy_violation: "Policy violation",
};

export const rentPeriodLabels: Record<RentPeriod, string> = {
  monthly: "per month",
  weekly: "per week",
  nightly: "per night",
};

export const amenityOptions = [
  "Parking",
  "Pool",
  "Gym",
  "Balcony",
  "Garden",
  "Elevator",
  "Furnished",
  "Fireplace",
  "Hardwood floors",
  "Dishwasher",
  "Laundry",
  "Patio",
  "Roof deck",
  "Pet friendly",
  "Central air",
  "Doorman",
];

export const cityCoordinates: Record<string, { lat: number; lng: number }> = {
  "new york": { lat: 40.7128, lng: -74.006 },
  brooklyn: { lat: 40.6782, lng: -73.9442 },
  austin: { lat: 30.2672, lng: -97.7431 },
  seattle: { lat: 47.6062, lng: -122.3321 },
  denver: { lat: 39.7392, lng: -104.9903 },
  miami: { lat: 25.7617, lng: -80.1918 },
  chicago: { lat: 41.8781, lng: -87.6298 },
  "los angeles": { lat: 34.0522, lng: -118.2437 },
  boston: { lat: 42.3601, lng: -71.0589 },
  portland: { lat: 45.5152, lng: -122.6784 },
  atlanta: { lat: 33.749, lng: -84.388 },
  philadelphia: { lat: 39.9526, lng: -75.1652 },
};

export const citySuggestions = Object.keys(cityCoordinates).map((key) =>
  key.replace(/\b\w/g, (letter) => letter.toUpperCase()),
);

export function coverImage(images: PropertyImage[]): PropertyImage | null {
  return images.find((image) => image.isCover) ?? images[0] ?? null;
}
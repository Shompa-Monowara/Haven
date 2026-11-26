import {
  PROPERTY_TYPES,
  propertyTypeLabels,
  type ListingType,
  type PropertyType,
} from "@/types/property";

export type SortOption = "newest" | "relevance" | "price_asc" | "price_desc" | "size_desc";
export type SearchView = "grid" | "list" | "map";

export interface SearchState {
  q: string;
  listingType: "" | ListingType;
  propertyTypes: PropertyType[];
  city: string;
  neighborhood: string;
  minPrice: string;
  maxPrice: string;
  beds: string;
  baths: string;
  minSize: string;
  maxSize: string;
  amenities: string[];
  sort: SortOption;
  page: number;
  view: SearchView;
  bounds: string;
}

export const sortOptions: Array<{ value: SortOption; label: string }> = [
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price low to high" },
  { value: "price_desc", label: "Price high to low" },
  { value: "size_desc", label: "Largest" },
];

export const bedFilterOptions = [
  { value: "", label: "Any" },
  { value: "1", label: "1+" },
  { value: "2", label: "2+" },
  { value: "3", label: "3+" },
  { value: "4", label: "4+" },
  { value: "5", label: "5+" },
];

export const bathFilterOptions = [
  { value: "", label: "Any" },
  { value: "1", label: "1+" },
  { value: "2", label: "2+" },
  { value: "3", label: "3+" },
  { value: "4", label: "4+" },
];

export const filterAmenities = [
  "Parking",
  "Pool",
  "Gym",
  "Balcony",
  "Garden",
  "Elevator",
  "Furnished",
];

const validTypes = new Set<string>(PROPERTY_TYPES);
const validSorts = new Set<string>(sortOptions.map((option) => option.value));

function layoutPreference(): "grid" | "list" {
  if (typeof window === "undefined") return "grid";
  return window.localStorage.getItem("haven:propertyLayout") === "list" ? "list" : "grid";
}

export function parseSearchState(params: URLSearchParams): SearchState {
  const propertyTypes = (params.get("propertyType") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value): value is PropertyType => validTypes.has(value));

  const sortParam = params.get("sort");
  const viewParam = params.get("view");
  const page = Number(params.get("page") ?? "1");

  return {
    q: params.get("q") ?? "",
    listingType: params.get("listingType") === "sale" || params.get("listingType") === "rent"
      ? (params.get("listingType") as ListingType)
      : "",
    propertyTypes,
    city: params.get("city") ?? "",
    neighborhood: params.get("neighborhood") ?? "",
    minPrice: params.get("minPrice") ?? "",
    maxPrice: params.get("maxPrice") ?? "",
    beds: params.get("beds") ?? "",
    baths: params.get("baths") ?? "",
    minSize: params.get("minSize") ?? "",
    maxSize: params.get("maxSize") ?? "",
    amenities: (params.get("amenities") ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
    sort: sortParam && validSorts.has(sortParam) ? (sortParam as SortOption) : "newest",
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
    view: viewParam === "map" ? "map" : layoutPreference(),
    bounds: params.get("bounds") ?? "",
  };
}

export function toSearchParams(state: SearchState): URLSearchParams {
  const params = new URLSearchParams();

  if (state.q.trim()) params.set("q", state.q.trim());
  if (state.listingType) params.set("listingType", state.listingType);
  if (state.propertyTypes.length) params.set("propertyType", state.propertyTypes.join(","));
  if (state.city) params.set("city", state.city);
  if (state.neighborhood) params.set("neighborhood", state.neighborhood);
  if (state.minPrice) params.set("minPrice", state.minPrice);
  if (state.maxPrice) params.set("maxPrice", state.maxPrice);
  if (state.beds) params.set("beds", state.beds);
  if (state.baths) params.set("baths", state.baths);
  if (state.minSize) params.set("minSize", state.minSize);
  if (state.maxSize) params.set("maxSize", state.maxSize);
  if (state.amenities.length) params.set("amenities", state.amenities.join(","));
  if (state.sort !== "newest") params.set("sort", state.sort);
  if (state.page > 1) params.set("page", String(state.page));
  if (state.view === "map") params.set("view", "map");
  if (state.bounds) params.set("bounds", state.bounds);

  return params;
}

export function criteriaFromState(state: SearchState): string {
  const params = toSearchParams({ ...state, page: 1, view: "grid", sort: "newest" });
  params.delete("page");
  params.delete("view");
  params.delete("sort");
  return params.toString();
}

export function buildApiQuery(state: SearchState, limit = 24): string {
  const params = new URLSearchParams();

  if (state.q.trim()) params.set("q", state.q.trim());
  if (state.listingType) params.set("listingType", state.listingType);
  if (state.propertyTypes.length) params.set("propertyType", state.propertyTypes.join(","));
  if (state.city) params.set("city", state.city);
  if (state.neighborhood) params.set("neighborhood", state.neighborhood);
  if (state.minPrice) params.set("minPrice", state.minPrice);
  if (state.maxPrice) params.set("maxPrice", state.maxPrice);
  if (state.beds) params.set("beds", state.beds);
  if (state.baths) params.set("baths", state.baths);
  if (state.minSize) params.set("minSize", state.minSize);
  if (state.maxSize) params.set("maxSize", state.maxSize);
  if (state.amenities.length) params.set("amenities", state.amenities.join(","));
  params.set("sort", state.sort);
  params.set("page", String(state.page));
  params.set("limit", String(limit));
  if (state.bounds) params.set("bounds", state.bounds);

  return params.toString();
}

export interface FilterChip {
  key: string;
  label: string;
  clear: Partial<SearchState>;
}

export function activeChips(state: SearchState): FilterChip[] {
  const chips: FilterChip[] = [];

  if (state.q) chips.push({ key: "q", label: `"${state.q}"`, clear: { q: "" } });
  if (state.listingType) {
    chips.push({
      key: "listingType",
      label: state.listingType === "sale" ? "For sale" : "For rent",
      clear: { listingType: "" },
    });
  }
  state.propertyTypes.forEach((type) => {
    chips.push({
      key: `type-${type}`,
      label: propertyTypeLabels[type],
      clear: {
        propertyTypes: state.propertyTypes.filter((value) => value !== type),
      },
    });
  });
  if (state.city) chips.push({ key: "city", label: state.city, clear: { city: "" } });
  if (state.neighborhood) {
    chips.push({
      key: "neighborhood",
      label: state.neighborhood,
      clear: { neighborhood: "" },
    });
  }
  if (state.minPrice || state.maxPrice) {
    const label =
      state.minPrice && state.maxPrice
        ? `$${Number(state.minPrice).toLocaleString()} – $${Number(state.maxPrice).toLocaleString()}`
        : state.minPrice
          ? `From $${Number(state.minPrice).toLocaleString()}`
          : `Up to $${Number(state.maxPrice).toLocaleString()}`;
    chips.push({ key: "price", label, clear: { minPrice: "", maxPrice: "" } });
  }
  if (state.beds) chips.push({ key: "beds", label: `${state.beds}+ beds`, clear: { beds: "" } });
  if (state.baths) chips.push({ key: "baths", label: `${state.baths}+ baths`, clear: { baths: "" } });
  if (state.minSize || state.maxSize) {
    const label =
      state.minSize && state.maxSize
        ? `${Number(state.minSize).toLocaleString()} – ${Number(state.maxSize).toLocaleString()} sq ft`
        : state.minSize
          ? `${Number(state.minSize).toLocaleString()}+ sq ft`
          : `Up to ${Number(state.maxSize).toLocaleString()} sq ft`;
    chips.push({ key: "size", label, clear: { minSize: "", maxSize: "" } });
  }
  state.amenities.forEach((amenity) => {
    chips.push({
      key: `amenity-${amenity}`,
      label: amenity.replace(/\b\w/g, (letter) => letter.toUpperCase()),
      clear: { amenities: state.amenities.filter((value) => value !== amenity) },
    });
  });
  if (state.bounds) chips.push({ key: "bounds", label: "Map area", clear: { bounds: "" } });

  return chips;
}

export function setLayoutPreference(layout: "grid" | "list") {
  window.localStorage.setItem("haven:propertyLayout", layout);
}
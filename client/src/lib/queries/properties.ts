import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { buildApiQuery, type SearchState } from "@/lib/search/search-state";
import { useAuthStore } from "@/stores/auth-store";
import type { PageMeta, PropertyDetail, PropertySummary } from "@/types/property";

const DEFAULT_SEARCH_QUERY = "sort=newest&page=1&limit=24";

function prerenderedSearch(query: string) {
  if (typeof window === "undefined" || query !== DEFAULT_SEARCH_QUERY) return undefined;
  return (window as unknown as {
    __HAVEN_SEARCH__?: { data: PropertySummary[]; meta: PageMeta };
  }).__HAVEN_SEARCH__;
}

export const propertyKeys = {
  all: ["properties"] as const,
  featured: ["properties", "featured"] as const,
  mine: ["properties", "mine"] as const,
  detail: (slug: string) => ["properties", "detail", slug] as const,
  edit: (id: string) => ["properties", "edit", id] as const,
  similar: (slug: string) => ["properties", "similar", slug] as const,
};

export function useFeaturedProperties() {
  return useQuery({
    queryKey: propertyKeys.featured,
    queryFn: () => api.getPage<PropertySummary[]>("/properties?featured=true&limit=4&sort=newest"),
  });
}

export function useProperty(slug: string | undefined) {
  const authStatus = useAuthStore((state) => state.status);
  const userId = useAuthStore((state) => state.user?.id);

  return useQuery({
    queryKey: [...propertyKeys.detail(slug ?? ""), userId ?? "guest"],
    queryFn: () => api.get<PropertyDetail>(`/properties/${encodeURIComponent(slug ?? "")}`),
    enabled: Boolean(slug) && authStatus !== "loading",
    retry: false,
  });
}

export function useSimilarProperties(slug: string | undefined, enabled = true) {
  return useQuery({
    queryKey: propertyKeys.similar(slug ?? ""),
    queryFn: () => api.get<PropertySummary[]>(`/properties/${encodeURIComponent(slug ?? "")}/similar`),
    enabled: Boolean(slug) && enabled,
    retry: false,
  });
}

export function useMyListings() {
  return useQuery({
    queryKey: propertyKeys.mine,
    queryFn: () => api.get<PropertySummary[]>("/properties/mine"),
    staleTime: 10_000,
  });
}

export function usePropertyForEdit(id: string | undefined) {
  return useQuery({
    queryKey: propertyKeys.edit(id ?? ""),
    queryFn: () => api.get<PropertyDetail>(`/properties/mine/${encodeURIComponent(id ?? "")}`),
    enabled: Boolean(id),
    retry: false,
  });
}

export function usePropertySearch(state: SearchState, limit = 24) {
  const query = buildApiQuery(state, limit);
  const initialData = prerenderedSearch(query);

  return useQuery({
    queryKey: ["properties", "search", query],
    queryFn: () => api.getPage<PropertySummary[]>(`/properties?${query}`),
    initialData,
    initialDataUpdatedAt: initialData ? 0 : undefined,
    placeholderData: keepPreviousData,
    staleTime: 20_000,
  });
}

export interface CityCount {
  city: string;
  count: number;
}

export interface NeighborhoodCount {
  neighborhood: string;
  count: number;
}

export function useNeighborhoodCounts(city: string) {
  return useQuery({
    queryKey: ["locations", "neighborhoods", city],
    queryFn: () =>
      api.get<NeighborhoodCount[]>(
        `/locations/neighborhoods?city=${encodeURIComponent(city)}`,
      ),
    enabled: city.trim().length > 0,
    staleTime: 60_000,
  });
}

export function useCityCounts(enabled = true) {
  return useQuery({
    queryKey: ["locations", "cities"],
    queryFn: () => api.get<CityCount[]>("/locations/cities"),
    staleTime: 60_000,
    enabled,
  });
}
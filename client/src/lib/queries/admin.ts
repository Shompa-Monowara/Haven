import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { PageMeta, PropertyStatus, PropertySummary } from "@/types/property";
import type { AdminListingDetail, AdminStats, AdminUser, AuditEntry } from "@/types/admin";

export const adminKeys = {
  stats: ["admin", "stats"] as const,
  listings: (filters: unknown) => ["admin", "listings", filters] as const,
  listing: (id: string) => ["admin", "listing", id] as const,
  users: (filters: unknown) => ["admin", "users", filters] as const,
  audit: (filters: unknown) => ["admin", "audit", filters] as const,
};

export function useAdminStats() {
  return useQuery({
    queryKey: adminKeys.stats,
    queryFn: () => api.get<AdminStats>("/admin/stats"),
    staleTime: 15_000,
  });
}

export function useAdminListings(filters: {
  status?: PropertyStatus | "all";
  q?: string;
  listingType?: string;
  propertyType?: string;
  city?: string;
  page?: number;
}) {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  if (filters.q) params.set("q", filters.q);
  if (filters.listingType) params.set("listingType", filters.listingType);
  if (filters.propertyType) params.set("propertyType", filters.propertyType);
  if (filters.city) params.set("city", filters.city);
  params.set("page", String(filters.page ?? 1));
  params.set("limit", "24");

  return useQuery({
    queryKey: adminKeys.listings(Object.fromEntries(params)),
    queryFn: () =>
      api.getPage<PropertySummary[]>(`/admin/listings?${params.toString()}`) as Promise<{
        data: PropertySummary[];
        meta: PageMeta;
      }>,
    placeholderData: (previous) => previous,
  });
}

export function useAdminListing(id: string | null) {
  return useQuery({
    queryKey: adminKeys.listing(id ?? ""),
    queryFn: () => api.get<AdminListingDetail>(`/admin/listings/${id}`),
    enabled: Boolean(id),
    retry: false,
  });
}

export function useAdminUsers(filters: {
  role?: "buyer" | "agent" | "admin";
  status?: "active" | "pending_approval" | "suspended";
  q?: string;
  page?: number;
}) {
  const params = new URLSearchParams();
  if (filters.role) params.set("role", filters.role);
  if (filters.status) params.set("status", filters.status);
  if (filters.q) params.set("q", filters.q);
  params.set("page", String(filters.page ?? 1));
  params.set("limit", "24");

  return useQuery({
    queryKey: adminKeys.users(Object.fromEntries(params)),
    queryFn: () =>
      api.getPage<AdminUser[]>(`/admin/users?${params.toString()}`) as Promise<{
        data: AdminUser[];
        meta: PageMeta;
      }>,
    placeholderData: (previous) => previous,
  });
}

export function useAdminAudit(filters: {
  entity?: "Property" | "User" | "AgentProfile";
  page?: number;
}) {
  const params = new URLSearchParams();
  if (filters.entity) params.set("entity", filters.entity);
  params.set("page", String(filters.page ?? 1));
  params.set("limit", "30");

  return useQuery({
    queryKey: adminKeys.audit(Object.fromEntries(params)),
    queryFn: () =>
      api.getPage<AuditEntry[]>(`/admin/audit?${params.toString()}`) as Promise<{
        data: AuditEntry[];
        meta: PageMeta;
      }>,
    placeholderData: (previous) => previous,
  });
}
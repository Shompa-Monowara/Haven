import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

import { AdminListingDrawer } from "@/components/admin/AdminListingDrawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiClientError, api } from "@/lib/api";
import { formatPrice, formatRelativeDate, formatRent } from "@/lib/format";
import { adminKeys, useAdminListings, useAdminStats } from "@/lib/queries/admin";
import { cn } from "@/lib/utils";
import {
  PROPERTY_TYPES,
  coverImage,
  propertyTypeLabels,
  statusLabels,
  statusTones,
  type PropertyStatus,
  type PropertySummary,
} from "@/types/property";

const tabs: Array<{ value: "all" | PropertyStatus; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "changes_requested", label: "Changes requested" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All" },
];

function priceLabel(property: PropertySummary) {
  return property.listingType === "rent"
    ? formatRent(property.price, property.rentPeriod ?? "monthly")
    : formatPrice(property.price);
}

export function AdminApprovalsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"all" | PropertyStatus>("pending");
  const [q, setQ] = useState("");
  const [listingType, setListingType] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [city, setCity] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const stats = useAdminStats();
  const listings = useAdminListings({ status, q, listingType, propertyType, city, page });
  const items = listings.data?.data ?? [];
  const meta = listings.data?.meta;
  const pendingItems = useMemo(() => items.filter((item) => item.status === "pending"), [items]);
  const selectedCount = selected.size;

  function changeStatus(next: "all" | PropertyStatus) {
    setStatus(next);
    setPage(1);
    setSelected(new Set());
  }

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((current) =>
      current.size === pendingItems.length
        ? new Set()
        : new Set(pendingItems.map((item) => item.id)),
    );
  }

  const bulkApprove = useMutation({
    mutationFn: () =>
      api.post<{ approved: number }>("/admin/listings/bulk-approve", {
        ids: [...selected],
      }),
    onSuccess: (result) => {
      toast.success(
        `${result.approved} ${result.approved === 1 ? "listing" : "listings"} approved and published`,
      );
      setSelected(new Set());
      setBulkOpen(false);
      void queryClient.invalidateQueries({ queryKey: adminKeys.stats });
      void queryClient.invalidateQueries({ queryKey: ["admin", "listings"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiClientError ? error.message : "Bulk approval failed");
    },
  });

  const statusCounts = stats.data?.statusCounts ?? {};
  const totalCount = Object.values(statusCounts).reduce((total, count) => total + (count ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[26px] font-bold leading-tight text-heading sm:text-[30px]">
            Approval queue
          </h2>
          <p className="mt-1.5 text-sm text-body">
            Review submissions, publish clean listings, and send clear change requests.
          </p>
        </div>
        {selectedCount > 0 ? (
          <Button type="button" onClick={() => setBulkOpen(true)}>
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Approve selected ({selectedCount})
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Approval status">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={status === tab.value}
            onClick={() => changeStatus(tab.value)}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-pill border px-3 text-xs font-medium transition-colors",
              status === tab.value
                ? "border-brand bg-brand-soft text-ink"
                : "border-line bg-surface text-body hover:border-brand hover:text-heading",
            )}
          >
            {tab.label}
            <span className="text-muted tabular">
              {tab.value === "all" ? totalCount : (statusCounts[tab.value as PropertyStatus] ?? 0)}
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-2 rounded-lg border border-line bg-surface p-3 sm:grid-cols-2 lg:grid-cols-[1fr_150px_170px_170px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <Input
            value={q}
            onChange={(event) => {
              setQ(event.target.value);
              setPage(1);
            }}
            placeholder="Search title or city"
            aria-label="Search listings"
            className="h-10 pl-9"
          />
        </div>
        <select
          value={listingType}
          onChange={(event) => {
            setListingType(event.target.value);
            setPage(1);
          }}
          aria-label="Listing type"
          className="h-10 rounded-md border border-line bg-surface px-2.5 text-sm text-heading"
        >
          <option value="">All types</option>
          <option value="sale">For sale</option>
          <option value="rent">For rent</option>
        </select>
        <select
          value={propertyType}
          onChange={(event) => {
            setPropertyType(event.target.value);
            setPage(1);
          }}
          aria-label="Property type"
          className="h-10 rounded-md border border-line bg-surface px-2.5 text-sm text-heading"
        >
          <option value="">All property types</option>
          {PROPERTY_TYPES.map((type) => (
            <option key={type} value={type}>
              {propertyTypeLabels[type]}
            </option>
          ))}
        </select>
        <Input
          value={city}
          onChange={(event) => {
            setCity(event.target.value);
            setPage(1);
          }}
          placeholder="City"
          aria-label="City"
          className="h-10"
        />
      </div>

      {listings.isPending ? (
        <div className="space-y-2 rounded-lg border border-line bg-surface p-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : listings.isError ? (
        <div className="rounded-lg border border-line bg-surface p-8 text-center">
          <p className="font-medium text-heading">The queue could not load</p>
          <Button variant="outline" className="mt-4" onClick={() => listings.refetch()}>
            Try again
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-canvas px-6 py-16 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface text-success shadow-xs">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <h3 className="mt-3 text-lg font-semibold text-heading">
            {status === "pending" ? "You're all caught up" : "No listings match"}
          </h3>
          <p className="mt-1 text-sm text-body">
            {status === "pending"
              ? "There are no listings waiting for review right now."
              : "Try another status or clear the filters."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse text-left text-sm">
              <caption className="sr-only">Listings awaiting or in review</caption>
              <thead>
                <tr className="border-b border-line bg-canvas text-xs uppercase tracking-[0.06em] text-muted">
                  <th scope="col" className="w-10 px-3 py-3">
                    {status === "pending" && pendingItems.length ? (
                      <input
                        type="checkbox"
                        checked={selected.size > 0 && selected.size === pendingItems.length}
                        onChange={toggleAll}
                        aria-label="Select all pending listings"
                        className="h-4 w-4 rounded-sm border-line text-brand-strong focus:ring-brand"
                      />
                    ) : null}
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">Property</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Agent</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Submitted</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Price</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">Review</th>
                </tr>
              </thead>
              <tbody>
                {items.map((property) => {
                  const image = coverImage(property.images);
                  return (
                    <tr key={property.id} className="border-b border-line align-middle last:border-0">
                      <td className="px-3 py-3">
                        {property.status === "pending" ? (
                          <input
                            type="checkbox"
                            checked={selected.has(property.id)}
                            onChange={() => toggle(property.id)}
                            aria-label={`Select ${property.title}`}
                            className="h-4 w-4 rounded-sm border-line text-brand-strong focus:ring-brand"
                          />
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <span className="h-12 w-16 shrink-0 overflow-hidden rounded-sm bg-canvas">
                            {image ? (
                              <img src={image.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                            ) : null}
                          </span>
                          <span className="min-w-0">
                            <span className="block max-w-[280px] truncate font-medium text-heading">
                              {property.title}
                            </span>
                            <span className="block text-xs text-body">{property.address.city}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-heading">{property.agent?.name ?? "—"}</p>
                        <p className="text-xs text-body">{property.agent?.agency ?? "Independent"}</p>
                      </td>
                      <td className="px-3 py-3 text-body">
                        {property.submittedAt ? formatRelativeDate(property.submittedAt) : "—"}
                      </td>
                      <td className="px-3 py-3 text-heading tabular">{priceLabel(property)}</td>
                      <td className="px-3 py-3">
                        <Badge variant={statusTones[property.status]}>{statusLabels[property.status]}</Badge>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {property.status === "approved" ? (
                            <Button asChild variant="ghost" size="sm">
                              <Link to={`/properties/${property.slug}`}>View</Link>
                            </Button>
                          ) : null}
                          <Button variant="outline" size="sm" onClick={() => setDrawerId(property.id)}>
                            Review
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {meta && meta.totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-body">
          <p>
            Page {meta.page} of {meta.totalPages} · {meta.total} total
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page >= meta.totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      <AdminListingDrawer
        listingId={drawerId}
        open={Boolean(drawerId)}
        onOpenChange={(open) => !open && setDrawerId(null)}
      />

      <ConfirmDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        title={`Approve ${selectedCount} ${selectedCount === 1 ? "listing" : "listings"}?`}
        description="Selected pending listings will be published immediately and their agents notified. This cannot be undone from the queue."
        confirmLabel="Approve all selected"
        loading={bulkApprove.isPending}
        onConfirm={() => bulkApprove.mutate()}
      />
    </div>
  );
}
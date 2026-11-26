import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Archive, Eye, Home, Pencil, PlusCircle, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiClientError, api } from "@/lib/api";
import { formatPrice, formatRelativeDate, formatRent } from "@/lib/format";
import { useInquiries } from "@/lib/queries/engagement";
import { propertyKeys, useMyListings } from "@/lib/queries/properties";
import { usePageParam } from "@/lib/use-page-param";
import {
  coverImage,
  statusLabels,
  statusTones,
  type PropertyStatus,
  type PropertySummary,
} from "@/types/property";
import { cn } from "@/lib/utils";

const filters: Array<{ label: string; value: "all" | PropertyStatus }> = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Changes requested", value: "changes_requested" },
  { label: "Rejected", value: "rejected" },
  { label: "Archived", value: "archived" },
];

const LISTINGS_PAGE_SIZE = 10;

function priceLabel(property: PropertySummary) {
  return property.listingType === "rent"
    ? formatRent(property.price, property.rentPeriod ?? "monthly")
    : formatPrice(property.price);
}

function editable(status: PropertyStatus) {
  return ["draft", "changes_requested", "rejected", "approved"].includes(status);
}

export function AgentListingsPage() {
  const queryClient = useQueryClient();
  const { data, isPending, isError, refetch } = useMyListings();
  const inquiries = useInquiries();
  const [page, setPage] = usePageParam();
  const [filter, setFilter] = useState<"all" | PropertyStatus>("all");
  const [pendingAction, setPendingAction] = useState<
    { type: "archive" | "delete"; property: PropertySummary } | null
  >(null);

  const listings = data ?? [];
  const leadsByProperty = useMemo(() => {
    const counts = new Map<string, number>();
    for (const lead of inquiries.data ?? []) {
      if (!lead.property) continue;
      counts.set(lead.property.id, (counts.get(lead.property.id) ?? 0) + 1);
    }
    return counts;
  }, [inquiries.data]);
  const filtered = useMemo(
    () => (filter === "all" ? listings : listings.filter((item) => item.status === filter)),
    [filter, listings],
  );
  const listRef = useRef<HTMLDivElement | null>(null);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / LISTINGS_PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * LISTINGS_PAGE_SIZE;
  const pageItems = filtered.slice(startIndex, startIndex + LISTINGS_PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages, { replace: true });
  }, [page, totalPages, setPage]);

  function resetPage() {
    if (page !== 1) setPage(1);
  }

  function changeFilter(next: "all" | PropertyStatus) {
    setFilter(next);
    resetPage();
  }

  function goToPage(next: number) {
    setPage(next);
    const element = listRef.current;
    if (!element) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: propertyKeys.mine });
    void queryClient.invalidateQueries({ queryKey: propertyKeys.featured });
  }

  const archiveMutation = useMutation({
    mutationFn: (property: PropertySummary) => api.post(`/properties/${property.id}/archive`),
    onSuccess: () => {
      toast.success("Listing archived");
      setPendingAction(null);
      refresh();
    },
    onError: (error) => {
      toast.error(error instanceof ApiClientError ? error.message : "The listing could not be archived");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (property: PropertySummary) => api.delete(`/properties/${property.id}`),
    onSuccess: () => {
      toast.success("Draft deleted");
      setPendingAction(null);
      refresh();
    },
    onError: (error) => {
      toast.error(error instanceof ApiClientError ? error.message : "The draft could not be deleted");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[26px] font-bold leading-tight text-heading sm:text-[30px]">My listings</h2>
          <p className="mt-1.5 text-sm text-body">
            Drafts, submissions, and published homes in one place. Approved listings return to review
            when material details change.
          </p>
        </div>
        <Button asChild>
          <Link to="/agent/listings/new">
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
            Add listing
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter listings by status">
        {filters.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => changeFilter(option.value)}
            aria-pressed={filter === option.value}
            className={cn(
              "h-9 rounded-pill border px-3 text-xs font-medium transition-colors",
              filter === option.value
                ? "border-brand bg-brand-soft text-ink"
                : "border-line bg-surface text-body hover:border-brand hover:text-heading",
            )}
          >
            {option.label}
            {option.value !== "all" ? (
              <span className="ml-1.5 text-muted tabular">
                {listings.filter((item) => item.status === option.value).length}
              </span>
            ) : (
              <span className="ml-1.5 text-muted tabular">{listings.length}</span>
            )}
          </button>
        ))}
      </div>

      {isPending ? (
        <div className="space-y-3 rounded-lg border border-line bg-surface p-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-line bg-surface p-8 text-center">
          <p className="font-medium text-heading">Your listings could not load</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line bg-canvas px-6 py-14 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface text-brand-strong shadow-xs">
            <Home className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="mt-3 text-sm font-medium text-heading">
            {listings.length ? "No listings match this filter" : "No listings yet"}
          </p>
          <p className="mt-1 max-w-sm text-sm text-body">
            {listings.length
              ? "Choose another status to see more of your homes."
              : "Start with the basics, add photos, and submit when it is ready for review."}
          </p>
          {!listings.length ? (
            <Button asChild className="mt-4">
              <Link to="/agent/listings/new">Create your first listing</Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <div ref={listRef} className="overflow-hidden rounded-lg border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left text-sm">
              <caption className="sr-only">Your property listings</caption>
              <thead>
                <tr className="border-b border-line bg-canvas text-xs uppercase tracking-[0.06em] text-muted">
                  <th scope="col" className="px-4 py-3 font-semibold">Property</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Price</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Views</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Leads</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Updated</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((property) => {
                  const image = coverImage(property.images);
                  return (
                    <tr key={property.id} className="border-b border-line last:border-0 align-middle">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="h-12 w-16 shrink-0 overflow-hidden rounded-sm bg-canvas">
                            {image ? (
                              <img src={image.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-muted">
                                <Home className="h-4 w-4" aria-hidden="true" />
                              </span>
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-heading">{property.title}</span>
                            <span className="block truncate text-xs text-body">
                              {[property.address.neighborhood, property.address.city]
                                .filter(Boolean)
                                .join(", ") || "No address yet"}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusTones[property.status]}>{statusLabels[property.status]}</Badge>
                      </td>
                      <td className="px-4 py-3 text-heading tabular">{priceLabel(property)}</td>
                      <td className="px-4 py-3 text-body tabular">{property.views}</td>
                      <td className="px-4 py-3 text-body tabular">
                        {leadsByProperty.get(property.id) ?? 0}
                      </td>
                      <td className="px-4 py-3 text-body">{formatRelativeDate(property.updatedAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          {editable(property.status) ? (
                            <Button asChild variant="ghost" size="sm">
                              <Link to={`/agent/listings/${property.id}/edit`} aria-label={`Edit ${property.title}`}>
                                <Pencil className="h-4 w-4" aria-hidden="true" />
                                Edit
                              </Link>
                            </Button>
                          ) : null}
                          <Button asChild variant="ghost" size="sm">
                            <Link to={`/properties/${property.slug}`} aria-label={`Preview ${property.title}`}>
                              <Eye className="h-4 w-4" aria-hidden="true" />
                              Preview
                            </Link>
                          </Button>
                          {property.status === "approved" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPendingAction({ type: "archive", property })}
                            >
                              <Archive className="h-4 w-4" aria-hidden="true" />
                              Archive
                            </Button>
                          ) : null}
                          {property.status === "draft" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-danger hover:bg-danger-tint hover:text-danger"
                              onClick={() => setPendingAction({ type: "delete", property })}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                              Delete
                            </Button>
                          ) : null}
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

      <Pagination
        page={currentPage}
        totalPages={totalPages}
        total={total}
        limit={LISTINGS_PAGE_SIZE}
        label="Listing pages"
        onPageChange={goToPage}
      />

      <ConfirmDialog
        open={pendingAction?.type === "archive"}
        onOpenChange={(open) => !open && setPendingAction(null)}
        title="Archive this listing?"
        description={
          pendingAction
            ? `"${pendingAction.property.title}" will disappear from public search and its detail page will show as no longer available. You can restore it later.`
            : ""
        }
        confirmLabel="Archive listing"
        tone="danger"
        loading={archiveMutation.isPending}
        onConfirm={() => pendingAction && archiveMutation.mutate(pendingAction.property)}
      />

      <ConfirmDialog
        open={pendingAction?.type === "delete"}
        onOpenChange={(open) => !open && setPendingAction(null)}
        title="Delete this draft?"
        description={
          pendingAction
            ? `"${pendingAction.property.title}" and its photos will be permanently removed. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete draft"
        tone="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => pendingAction && deleteMutation.mutate(pendingAction.property)}
      />
    </div>
  );
}
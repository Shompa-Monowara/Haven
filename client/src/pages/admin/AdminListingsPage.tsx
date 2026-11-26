import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { AdminListingDrawer } from "@/components/admin/AdminListingDrawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice, formatRelativeDate, formatRent } from "@/lib/format";
import { useAdminListings } from "@/lib/queries/admin";
import { usePageParam } from "@/lib/use-page-param";
import { cn } from "@/lib/utils";
import {
  coverImage,
  statusLabels,
  statusTones,
  type PropertyStatus,
  type PropertySummary,
} from "@/types/property";

const statuses: Array<{ value: PropertyStatus | "all"; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending review" },
  { value: "approved", label: "Approved" },
  { value: "changes_requested", label: "Changes requested" },
  { value: "rejected", label: "Rejected" },
  { value: "archived", label: "Archived" },
];

function priceLabel(property: PropertySummary) {
  return property.listingType === "rent"
    ? formatRent(property.price, property.rentPeriod ?? "monthly")
    : formatPrice(property.price);
}

export function AdminListingsPage() {
  const [status, setStatus] = useState<PropertyStatus | "all">("all");
  const [q, setQ] = useState("");
  const [page, setPage] = usePageParam();
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const listings = useAdminListings({ status, q, page });
  const items = listings.data?.data ?? [];
  const meta = listings.data?.meta;
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!meta) return;
    const lastPage = Math.max(1, meta.totalPages);
    if (page > lastPage) setPage(lastPage, { replace: true });
  }, [meta, page, setPage]);

  function resetPage() {
    if (page !== 1) setPage(1);
  }

  function goToPage(next: number) {
    setPage(next);
    const element = listRef.current;
    if (!element) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[26px] font-bold leading-tight text-heading sm:text-[30px]">Listings</h2>
        <p className="mt-1.5 text-sm text-body">
          Every listing on the platform. Archive, restore, and review any submission.
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <Input
            value={q}
            onChange={(event) => {
              setQ(event.target.value);
              resetPage();
            }}
            placeholder="Search title or city"
            aria-label="Search listings"
            className="h-10 pl-9"
          />
        </div>
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as PropertyStatus | "all");
            resetPage();
          }}
          aria-label="Filter by status"
          className="h-10 rounded-md border border-line bg-surface px-3 text-sm text-heading sm:w-52"
        >
          {statuses.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {listings.isPending ? (
        <div className="space-y-2 rounded-lg border border-line bg-surface p-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      ) : items.length ? (
        <div
          ref={listRef}
          className={cn(
            "overflow-hidden rounded-lg border border-line bg-surface",
            listings.isFetching && "opacity-60 transition-opacity",
          )}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-left text-sm">
              <caption className="sr-only">All platform listings</caption>
              <thead>
                <tr className="border-b border-line bg-canvas text-xs uppercase tracking-[0.06em] text-muted">
                  <th scope="col" className="px-4 py-3 font-semibold">Property</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Agent</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Price</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Updated</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((property) => {
                  const image = coverImage(property.images);
                  return (
                    <tr key={property.id} className="border-b border-line align-middle last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="h-12 w-16 shrink-0 overflow-hidden rounded-sm bg-canvas">
                            {image ? (
                              <img src={image.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                            ) : null}
                          </span>
                          <span className="min-w-0">
                            <span className="block max-w-[300px] truncate font-medium text-heading">
                              {property.title}
                            </span>
                            <span className="block text-xs text-body">{property.address.city ?? "No city"}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-heading">{property.agent?.name ?? "—"}</p>
                        <p className="text-xs text-body">{property.agent?.agency ?? "Independent"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusTones[property.status]}>{statusLabels[property.status]}</Badge>
                      </td>
                      <td className="px-4 py-3 text-heading tabular">{priceLabel(property)}</td>
                      <td className="px-4 py-3 text-body">{formatRelativeDate(property.updatedAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          {property.status === "approved" ? (
                            <Button asChild variant="ghost" size="sm">
                              <Link to={`/properties/${property.slug}`}>View</Link>
                            </Button>
                          ) : null}
                          <Button variant="outline" size="sm" onClick={() => setDrawerId(property.id)}>
                            Manage
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
      ) : (
        <div className="rounded-lg border border-dashed border-line bg-canvas px-6 py-16 text-center">
          <p className="font-medium text-heading">No listings found</p>
          <p className="mt-1 text-sm text-body">Try a different status or search term.</p>
        </div>
      )}

      <Pagination
        page={meta?.page ?? page}
        totalPages={meta?.totalPages ?? 1}
        total={meta?.total ?? 0}
        limit={meta?.limit ?? 24}
        label="Listings pages"
        onPageChange={goToPage}
      />

      <AdminListingDrawer
        listingId={drawerId}
        open={Boolean(drawerId)}
        onOpenChange={(open) => !open && setDrawerId(null)}
      />
    </div>
  );
}
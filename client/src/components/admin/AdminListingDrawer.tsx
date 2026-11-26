import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";

import { PropertyGallery } from "@/components/property/PropertyGallery";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiClientError, api } from "@/lib/api";
import { formatArea, formatPrice, formatRelativeDate, formatRent } from "@/lib/format";
import { adminKeys, useAdminListing } from "@/lib/queries/admin";
import { auditActionLabels } from "@/types/admin";
import {
  propertyTypeLabels,
  rejectionCategoryLabels,
  statusLabels,
  statusTones,
  type PropertyDetail,
} from "@/types/property";

const rejectionCategories = [
  "incomplete_information",
  "poor_photos",
  "inaccurate_pricing",
  "duplicate",
  "policy_violation",
] as const;

type Decision = "approved" | "rejected" | "changes_requested";

interface AdminListingDrawerProps {
  listingId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}

function priceLabel(property: PropertyDetail) {
  return property.listingType === "rent"
    ? formatRent(property.price, property.rentPeriod ?? "monthly")
    : formatPrice(property.price);
}

export function AdminListingDrawer({
  listingId,
  open,
  onOpenChange,
  onChanged,
}: AdminListingDrawerProps) {
  const queryClient = useQueryClient();
  const { data, isPending, isError, error } = useAdminListing(open ? listingId : null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [reasonDecision, setReasonDecision] = useState<Decision | null>(null);
  const [reasonCategory, setReasonCategory] = useState<string>("");
  const [reasonNote, setReasonNote] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);

  const listing = data?.listing;
  const agent = data?.agent;

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: adminKeys.stats });
    void queryClient.invalidateQueries({ queryKey: ["admin", "listings"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
    if (listingId) void queryClient.invalidateQueries({ queryKey: adminKeys.listing(listingId) });
    onChanged?.();
  }

  const decision = useMutation({
    mutationFn: (input: { status: Decision; reasonCategory?: string; note?: string }) =>
      api.patch(`/admin/listings/${listingId}/status`, input),
    onSuccess: () => {
      toast.success("Review decision saved");
      setApproveOpen(false);
      setReasonDecision(null);
      setReasonCategory("");
      setReasonNote("");
      refresh();
      onOpenChange(false);
    },
    onError: (mutationError) => {
      toast.error(
        mutationError instanceof ApiClientError
          ? mutationError.message
          : "The decision could not be saved",
      );
    },
  });

  const archive = useMutation({
    mutationFn: () => api.post(`/admin/listings/${listingId}/archive`),
    onSuccess: () => {
      toast.success("Listing archived");
      setArchiveOpen(false);
      refresh();
    },
    onError: () => toast.error("The listing could not be archived"),
  });

  const restore = useMutation({
    mutationFn: () => api.post(`/admin/listings/${listingId}/restore`),
    onSuccess: () => {
      toast.success("Listing restored");
      setRestoreOpen(false);
      refresh();
    },
    onError: () => toast.error("The listing could not be restored"),
  });

  function openReason(next: Decision) {
    setReasonDecision(next);
    setReasonCategory("");
    setReasonNote("");
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="left-auto right-0 top-0 h-full w-full max-w-[720px] translate-x-0 translate-y-0 rounded-none border-y-0 border-r-0 p-0"
          aria-describedby={undefined}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
              <div className="min-w-0">
                <DialogTitle className="truncate text-lg font-semibold text-heading">
                  {listing?.title ?? "Listing review"}
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-sm text-body">
                  {listing ? `${propertyTypeLabels[listing.propertyType]} · ${listing.address.city ?? ""}` : "Loading listing details"}
                </DialogDescription>
              </div>
              {listing ? (
                <Badge variant={statusTones[listing.status]}>{statusLabels[listing.status]}</Badge>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {isPending ? (
                <div className="space-y-4">
                  <Skeleton className="h-64 w-full rounded-lg" />
                  <Skeleton className="h-8 w-2/3" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : isError || !listing ? (
                <div className="py-16 text-center">
                  <p className="font-medium text-heading">This listing could not be loaded</p>
                  <p className="mt-1 text-sm text-body">
                    {error instanceof ApiClientError ? error.message : "Try closing and reopening the review."}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <PropertyGallery images={listing.images} title={listing.title} />

                  <div>
                    <p className="font-display text-2xl font-bold text-heading tabular">
                      {priceLabel(listing)}
                    </p>
                    <p className="mt-1 flex items-start gap-1.5 text-sm text-body">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                      {[listing.address.street, listing.address.city, listing.address.state, listing.address.zip]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>

                  {listing.rejectionReason ? (
                    <div className="rounded-md border border-warning/40 bg-warning-tint px-4 py-3 text-sm text-warning-text">
                      <p className="font-semibold">
                        {rejectionCategoryLabels[listing.rejectionReason.category] ?? "Previous review note"}
                      </p>
                      <p className="mt-1">{listing.rejectionReason.note ?? "No note provided."}</p>
                    </div>
                  ) : null}

                  <dl className="grid grid-cols-2 gap-3 rounded-lg border border-line bg-canvas p-4 text-sm sm:grid-cols-4">
                    {[
                      ["Beds", listing.beds],
                      ["Baths", listing.baths],
                      ["Area", listing.sizeSqft ? formatArea(listing.sizeSqft) : "—"],
                      ["Year", listing.yearBuilt ?? "—"],
                    ].map(([label, value]) => (
                      <div key={String(label)}>
                        <dt className="text-xs text-muted">{label}</dt>
                        <dd className="mt-0.5 font-medium text-heading tabular">{value}</dd>
                      </div>
                    ))}
                  </dl>

                  <section>
                    <h3 className="text-sm font-semibold text-heading">Description</h3>
                    <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-body">
                      {listing.description || "No description provided."}
                    </p>
                  </section>

                  {listing.amenities.length ? (
                    <section>
                      <h3 className="text-sm font-semibold text-heading">Amenities</h3>
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {listing.amenities.map((amenity) => (
                          <li key={amenity} className="rounded-pill bg-canvas px-2.5 py-1 text-xs text-body">
                            {amenity}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}

                  {agent ? (
                    <section className="rounded-lg border border-line p-4">
                      <h3 className="text-sm font-semibold text-heading">Agent</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <p className="font-medium text-heading">{agent.name}</p>
                        {agent.verified ? (
                          <BadgeCheck className="h-4 w-4 text-brand-strong" aria-label="Verified agent" />
                        ) : (
                          <Badge variant="outline">Unverified</Badge>
                        )}
                      </div>
                      <p className="text-sm text-body">{agent.agency ?? "Independent agent"}</p>
                      <p className="mt-1 text-xs text-body">
                        <a href={`mailto:${agent.email}`} className="text-brand-strong hover:underline">
                          {agent.email}
                        </a>
                        {agent.licenseNumber ? ` · License ${agent.licenseNumber}` : ""}
                      </p>
                      {agent.bio ? <p className="mt-2 text-xs leading-relaxed text-body">{agent.bio}</p> : null}
                      <p className="mt-2 text-xs text-muted">
                        Submitted {listing.submittedAt ? formatRelativeDate(listing.submittedAt) : "—"}
                      </p>
                    </section>
                  ) : null}

                  <section>
                    <h3 className="text-sm font-semibold text-heading">Review history</h3>
                    {data?.audit.length ? (
                      <ol className="mt-3 space-y-3 border-l border-line pl-4">
                        {data.audit.map((entry) => (
                          <li key={entry.id}>
                            <p className="text-sm font-medium text-heading">
                              {auditActionLabels[entry.action] ?? entry.action}
                            </p>
                            <p className="text-xs text-muted">
                              {entry.actor?.name ?? "System"} · {formatRelativeDate(entry.createdAt)}
                            </p>
                            {entry.reason?.note ? (
                              <p className="mt-1 rounded-md bg-canvas px-2.5 py-1.5 text-xs text-body">
                                {entry.reason.note}
                              </p>
                            ) : null}
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="mt-2 text-xs text-muted">No review history yet.</p>
                    )}
                  </section>
                </div>
              )}
            </div>

            {listing ? (
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface px-5 py-4">
                {listing.status === "pending" ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      className="text-warning-text"
                      onClick={() => openReason("changes_requested")}
                    >
                      Request changes
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => openReason("rejected")}
                    >
                      Reject
                    </Button>
                    <Button type="button" onClick={() => setApproveOpen(true)}>
                      Approve and publish
                    </Button>
                  </>
                ) : null}

                {listing.status === "approved" ? (
                  <Button type="button" variant="danger" onClick={() => setArchiveOpen(true)}>
                    Archive listing
                  </Button>
                ) : null}

                {listing.status === "archived" ? (
                  <Button type="button" onClick={() => setRestoreOpen(true)}>
                    Restore listing
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title="Approve and publish this listing?"
        description={
          listing
            ? `"${listing.title}" will be visible in public search and on its detail page immediately. The agent will be notified.`
            : ""
        }
        confirmLabel="Approve and publish"
        loading={decision.isPending}
        onConfirm={() => decision.mutate({ status: "approved" })}
      />

      <Dialog
        open={Boolean(reasonDecision)}
        onOpenChange={(next) => !next && setReasonDecision(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-heading">
              {reasonDecision === "rejected" ? "Reject this listing" : "Request changes"}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-body">
              The note is shared with the agent.
              {reasonDecision === "changes_requested"
                ? " The listing stays editable and can be resubmitted."
                : " The listing will not be published."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label htmlFor="reason-category" className="mb-1.5 block text-sm font-medium text-heading">
                Reason category
              </label>
              <select
                id="reason-category"
                value={reasonCategory}
                onChange={(event) => setReasonCategory(event.target.value)}
                className="h-11 w-full rounded-md border border-line bg-surface px-3 text-sm text-heading focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
              >
                <option value="">Choose a category</option>
                {rejectionCategories.map((category) => (
                  <option key={category} value={category}>
                    {rejectionCategoryLabels[category]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="reason-note" className="mb-1.5 block text-sm font-medium text-heading">
                Note to the agent <span className="font-normal text-muted">(optional)</span>
              </label>
              <textarea
                id="reason-note"
                rows={4}
                value={reasonNote}
                onChange={(event) => setReasonNote(event.target.value)}
                placeholder="Explain what needs to change before this listing can be published."
                className="w-full resize-y rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-heading placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-line pt-4">
              <Button type="button" variant="outline" onClick={() => setReasonDecision(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant={reasonDecision === "rejected" ? "danger" : "primary"}
                loading={decision.isPending}
                onClick={() => {
                  if (!reasonCategory) {
                    toast.error("Choose a reason category");
                    return;
                  }
                  if (!reasonDecision) return;
                  decision.mutate({
                    status: reasonDecision,
                    reasonCategory,
                    note: reasonNote.trim() || undefined,
                  });
                }}
              >
                {reasonDecision === "rejected" ? "Reject listing" : "Request changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archive this listing?"
        description="It will disappear from public search. You can restore it from the listings table."
        confirmLabel="Archive listing"
        tone="danger"
        loading={archive.isPending}
        onConfirm={() => archive.mutate()}
      />

      <ConfirmDialog
        open={restoreOpen}
        onOpenChange={setRestoreOpen}
        title="Restore this listing?"
        description="The listing will return to its previous public state if it was published before."
        confirmLabel="Restore listing"
        loading={restore.isPending}
        onConfirm={() => restore.mutate()}
      />
    </>
  );
}
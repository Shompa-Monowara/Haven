import { ArrowRight, Building2, ClipboardCheck, Inbox, Users } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { AdminListingDrawer } from "@/components/admin/AdminListingDrawer";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice, formatRelativeDate, formatRent } from "@/lib/format";
import { useAdminStats } from "@/lib/queries/admin";
import { auditActionLabels } from "@/types/admin";

export function AdminOverview() {
  const { data, isPending } = useAdminStats();
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const kpis = data?.kpis;
  const pending = data?.pending ?? [];
  const activity = data?.recentActivity ?? [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-body">Administration</p>
        <h2 className="mt-1 text-[26px] font-bold leading-tight text-heading sm:text-[30px]">
          Keep the marketplace healthy.
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-body">
          Review new listings, monitor accounts, and keep the public catalog accurate.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pending approvals"
          value={isPending ? "—" : (kpis?.pendingApprovals ?? 0)}
          icon={ClipboardCheck}
          hint="Listings waiting for a decision."
          tone="warning"
        />
        <StatCard
          label="Live listings"
          value={isPending ? "—" : (kpis?.liveListings ?? 0)}
          icon={Building2}
          hint="Approved and visible to buyers."
        />
        <StatCard
          label="New users (7 days)"
          value={isPending ? "—" : (kpis?.newUsers ?? 0)}
          icon={Users}
          hint="Buyers, agents, and admins."
          tone="neutral"
        />
        <StatCard
          label="Open inquiries"
          value={isPending ? "—" : (kpis?.openInquiries ?? 0)}
          icon={Inbox}
          hint="New, contacted, or qualified leads."
          tone="success"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-lg border border-line bg-surface p-6" aria-labelledby="queue-heading">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 id="queue-heading" className="text-lg font-semibold text-heading">
                Approval queue
              </h3>
              <p className="mt-1 text-sm text-body">Next submissions in the order they arrived.</p>
            </div>
            <Link
              to="/admin/approvals"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-strong hover:underline"
            >
              Open queue
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {isPending ? (
            <div className="mt-4 space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          ) : pending.length ? (
            <ul className="mt-4 divide-y divide-line">
              {pending.map((listing) => (
                <li key={listing.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="h-12 w-16 shrink-0 overflow-hidden rounded-sm bg-canvas">
                    {listing.images[0] ? (
                      <img src={listing.images[0].url} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-heading">{listing.title}</span>
                    <span className="block truncate text-xs text-body">
                      {listing.agent?.name ?? "Agent"} · {listing.address.city} ·{" "}
                      {listing.submittedAt ? formatRelativeDate(listing.submittedAt) : "just now"}
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-heading tabular">
                    {listing.listingType === "rent"
                      ? formatRent(listing.price, listing.rentPeriod ?? "monthly")
                      : formatPrice(listing.price)}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setDrawerId(listing.id)}>
                    Review
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-5 rounded-lg border border-dashed border-line bg-canvas px-6 py-10 text-center">
              <p className="font-medium text-heading">You're all caught up</p>
              <p className="mt-1 text-sm text-body">No listings are waiting for review.</p>
            </div>
          )}
        </section>

        <div className="space-y-6">
          <section className="rounded-lg border border-line bg-surface p-6" aria-labelledby="activity-heading">
            <h3 id="activity-heading" className="text-lg font-semibold text-heading">
              Recent activity
            </h3>
            {isPending ? (
              <div className="mt-4 space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : activity.length ? (
              <ol className="mt-4 space-y-3">
                {activity.map((entry) => (
                  <li key={entry.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
                    <p className="text-sm font-medium text-heading">
                      {auditActionLabels[entry.action] ?? entry.action}
                    </p>
                    <p className="mt-0.5 text-xs text-body">
                      {entry.actor?.name ?? "System"} · {formatRelativeDate(entry.createdAt)}
                    </p>
                    {entry.reason?.note ? (
                      <p className="mt-1 line-clamp-2 text-xs text-muted">{entry.reason.note}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-sm text-body">No moderation activity yet.</p>
            )}
          </section>

          <section className="rounded-lg border border-line bg-surface p-6">
            <h3 className="text-lg font-semibold text-heading">Quick actions</h3>
            <div className="mt-3 flex flex-col gap-2">
              <Button asChild variant="outline" className="justify-start">
                <Link to="/admin/approvals">Review approvals</Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link to="/admin/listings">Manage listings</Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link to="/admin/users">Manage users</Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link to="/admin/audit">View audit log</Link>
              </Button>
            </div>
          </section>
        </div>
      </div>

      <AdminListingDrawer
        listingId={drawerId}
        open={Boolean(drawerId)}
        onOpenChange={(open) => !open && setDrawerId(null)}
      />
    </div>
  );
}
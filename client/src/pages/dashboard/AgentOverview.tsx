import { ArrowRight, Building2, CalendarCheck, Camera, Eye, Inbox, MessageCircle, PlusCircle, Star, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { StatCard } from "@/components/dashboard/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice, formatRent } from "@/lib/format";
import { useUnreadMessageCount } from "@/lib/queries/engagement";
import { useMyListings } from "@/lib/queries/properties";
import { useAuthStore } from "@/stores/auth-store";
import {
  coverImage,
  propertyTypeLabels,
  statusLabels,
  statusTones,
  type PropertySummary,
} from "@/types/property";

function priceLabel(property: PropertySummary) {
  return property.listingType === "rent"
    ? formatRent(property.price, property.rentPeriod ?? "monthly")
    : formatPrice(property.price);
}

export function AgentOverview() {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.agentProfile);
  const firstName = user?.name.split(" ")[0] ?? "there";
  const { data: listings, isPending } = useMyListings();
  const unread = useUnreadMessageCount();
  const [photoNudgeDismissed, setPhotoNudgeDismissed] = useState(() =>
    typeof window === "undefined"
      ? false
      : window.localStorage.getItem("haven:agentPhotoNudgeDismissed") === "1",
  );

  function dismissPhotoNudge() {
    window.localStorage.setItem("haven:agentPhotoNudgeDismissed", "1");
    setPhotoNudgeDismissed(true);
  }

  const approved = listings?.filter((listing) => listing.status === "approved") ?? [];
  const pending = listings?.filter((listing) => listing.status === "pending") ?? [];
  const totalViews = listings?.reduce((total, listing) => total + listing.views, 0) ?? 0;
  const recent = listings?.slice(0, 3) ?? [];
  const unreadCount = unread.data?.count ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-body">Welcome back</p>
        <h2 className="mt-1 text-[26px] font-bold leading-tight text-heading sm:text-[30px]">
          {firstName}, {approved.length ? "here is how your listings are doing." : "let's get your first listing live."}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-body">
          Draft a listing, submit it for review, and we will notify you the moment it is approved.
        </p>
      </div>

      {profile && !profile.verified ? (
        <div className="flex flex-col gap-3 rounded-lg border border-warning/40 bg-warning-tint px-4 py-3.5 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <Star className="mt-0.5 h-4 w-4 shrink-0 text-warning-text" aria-hidden="true" />
            <p className="text-warning-text">
              <span className="font-semibold">Verification pending.</span> An administrator reviews
              agency details before your verified badge appears. You can still create listings.
            </p>
          </div>
          <span className="shrink-0 rounded-pill bg-surface/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-warning-text">
            {profile.agency}
          </span>
        </div>
      ) : null}

      {profile && !user?.avatar && !photoNudgeDismissed ? (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-brand/30 bg-brand-soft px-4 py-3.5 text-sm">
          <div className="flex items-start gap-2.5">
            <Camera className="mt-0.5 h-4 w-4 shrink-0 text-brand-strong" aria-hidden="true" />
            <p className="text-ink">
              <span className="font-semibold">Add a profile photo.</span> Listings with an agent
              photo build more trust.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Link to="/agent/profile" className="font-medium text-brand-strong hover:underline">
              Add photo
            </Link>
            <button
              type="button"
              onClick={dismissPhotoNudge}
              aria-label="Dismiss photo reminder"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-body hover:bg-surface/70 hover:text-heading"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Active listings"
          value={isPending ? "—" : approved.length}
          icon={Building2}
          hint="Approved and visible to buyers."
        />
        <StatCard
          label="Total views"
          value={isPending ? "—" : totalViews}
          icon={Eye}
          hint="Across all of your listings."
          tone="neutral"
        />
        <Link
          to="/agent/messages"
          className="block rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <StatCard
            label="Unread messages"
            value={unreadCount}
            icon={MessageCircle}
            hint="Agent replies and property questions."
            tone="neutral"
          />
        </Link>
        <StatCard
          label="Pending review"
          value={isPending ? "—" : pending.length}
          icon={Inbox}
          hint="Submitted and waiting for a decision."
          tone="warning"
        />
        <StatCard
          label="Avg. response time"
          value={profile ? `${profile.responseTimeMinutes} min` : "—"}
          icon={CalendarCheck}
          hint="Shown publicly on your agent card."
          tone="success"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-lg border border-line bg-surface p-6" aria-labelledby="my-listings-heading">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 id="my-listings-heading" className="text-lg font-semibold text-heading">
                My listings
              </h3>
              <p className="mt-1 text-sm text-body">
                Drafts and submissions stay here until an admin approves them.
              </p>
            </div>
            <Link
              to="/agent/listings"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-strong hover:underline"
            >
              View all
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {isPending ? (
            <div className="mt-5 space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          ) : recent.length ? (
            <ul className="mt-5 divide-y divide-line">
              {recent.map((property) => {
                const image = coverImage(property.images);
                return (
                  <li key={property.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="h-12 w-16 shrink-0 overflow-hidden rounded-sm bg-canvas">
                      {image ? (
                        <img src={image.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-muted">
                          <Building2 className="h-4 w-4" aria-hidden="true" />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <Link
                        to={`/agent/listings/${property.id}/edit`}
                        className="block truncate text-sm font-medium text-heading hover:underline"
                      >
                        {property.title}
                      </Link>
                      <span className="mt-0.5 block truncate text-xs text-body">
                        {propertyTypeLabels[property.propertyType]} · {priceLabel(property)}
                      </span>
                    </span>
                    <Badge variant={statusTones[property.status]}>{statusLabels[property.status]}</Badge>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-6 flex flex-col items-center justify-center rounded-lg border border-dashed border-line bg-canvas px-6 py-10 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface text-brand-strong shadow-xs">
                <PlusCircle className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="mt-3 text-sm font-medium text-heading">No listings yet</p>
              <p className="mt-1 max-w-sm text-sm text-body">
                The listing wizard covers basics, location, photos, pricing, and review.
              </p>
              <Button asChild className="mt-4">
                <Link to="/agent/listings/new">
                  Create your first listing
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-line bg-surface p-6" aria-labelledby="agent-steps-heading">
          <h3 id="agent-steps-heading" className="text-lg font-semibold text-heading">
            Publish checklist
          </h3>
          <ol className="mt-4 space-y-4">
            {[
              { title: "Complete your profile", body: "Add a bio, service areas, and response time." },
              { title: "Draft your listing", body: "Add at least three photos and a map pin." },
              { title: "Submit for review", body: "Most listings are reviewed within one business day." },
              { title: "Respond to leads", body: "Inquiries appear in your leads inbox." },
            ].map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-strong tabular">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-heading">{step.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-body">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <Link
            to="/agent/profile"
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand-strong hover:underline"
          >
            Set up your profile
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>
      </div>
    </div>
  );
}
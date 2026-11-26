import { ArrowRight, CheckCircle2, Heart, Inbox, MessageCircle, Search } from "lucide-react";
import { Link } from "react-router-dom";

import { StatCard } from "@/components/dashboard/StatCard";
import { PropertyCard, PropertyCardSkeleton } from "@/components/property/PropertyCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeDate } from "@/lib/format";
import { useFavorites, useInquiries, useSavedSearches, useUnreadMessageCount } from "@/lib/queries/engagement";
import { useAuthStore } from "@/stores/auth-store";
import { inquiryStatusLabels, inquiryStatusTones } from "@/types/engagement";
import { Badge } from "@/components/ui/badge";

export function BuyerOverview() {
  const user = useAuthStore((state) => state.user);
  const firstName = user?.name.split(" ")[0] ?? "there";
  const favorites = useFavorites();
  const searches = useSavedSearches();
  const inquiries = useInquiries();
  const unread = useUnreadMessageCount();

  const savedHomes = favorites.data ?? [];
  const savedSearches = searches.data ?? [];
  const openInquiries =
    inquiries.data?.filter((item) => ["new", "contacted", "qualified"].includes(item.status)) ?? [];
  const unreadCount = unread.data?.count ?? 0;

  const checklist = [
    { label: "Create your account", done: true },
    { label: "Save a home to your shortlist", done: savedHomes.length > 0 },
    { label: "Create a saved search for alerts", done: savedSearches.length > 0 },
    { label: "Contact an agent about a listing", done: (inquiries.data?.length ?? 0) > 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-body">Welcome back</p>
        <h2 className="mt-1 text-[26px] font-bold leading-tight text-heading sm:text-[30px]">
          Plan your next move, {firstName}.
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-body">
          Your favorites, saved searches, and agent conversations all live here.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Saved homes"
          value={savedHomes.length}
          icon={Heart}
          hint="Homes you shortlist appear here."
        />
        <StatCard
          label="Saved searches"
          value={savedSearches.length}
          icon={Search}
          hint="Get alerts when a matching home is listed."
          tone="neutral"
        />
        <StatCard
          label="Unread messages"
          value={unreadCount}
          icon={MessageCircle}
          hint="Agent replies and property questions."
          tone="neutral"
        />
        <StatCard
          label="Open inquiries"
          value={openInquiries.length}
          icon={Inbox}
          hint="Requests awaiting an agent response."
          tone="success"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-lg border border-line bg-surface p-6" aria-labelledby="saved-homes-heading">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 id="saved-homes-heading" className="text-lg font-semibold text-heading">
                Saved homes
              </h3>
              <p className="mt-1 text-sm text-body">
                {savedHomes.length ? "Your shortlist, ready to compare." : "Tap the heart on any listing to keep it here."}
              </p>
            </div>
            <Link to="/account/favorites" className="text-sm font-medium text-brand-strong hover:underline">
              View all
            </Link>
          </div>

          {favorites.isPending ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <PropertyCardSkeleton key={index} />
              ))}
            </div>
          ) : savedHomes.length ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {savedHomes.slice(0, 2).map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          ) : (
            <div className="mt-6 flex flex-col items-center justify-center rounded-lg border border-dashed border-line bg-canvas px-6 py-10 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface text-danger shadow-xs">
                <Heart className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="mt-3 text-sm font-medium text-heading">No saved homes yet</p>
              <p className="mt-1 max-w-sm text-sm text-body">
                Browse verified listings and save the ones you want to compare.
              </p>
              <Button asChild className="mt-4">
                <Link to="/properties">
                  Browse homes
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          )}
        </section>

        <div className="space-y-6">
          <section className="rounded-lg border border-line bg-surface p-6" aria-labelledby="getting-started-heading">
            <h3 id="getting-started-heading" className="text-lg font-semibold text-heading">
              Getting started
            </h3>
            <ul className="mt-4 space-y-3">
              {checklist.map((item) => (
                <li key={item.label} className="flex items-start gap-3 text-sm">
                  <CheckCircle2
                    className={item.done ? "mt-0.5 h-4 w-4 text-success" : "mt-0.5 h-4 w-4 text-line"}
                    aria-hidden="true"
                  />
                  <span className={item.done ? "text-muted line-through" : "text-body"}>
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border border-line bg-surface p-6" aria-labelledby="recent-inquiries-heading">
            <div className="flex items-start justify-between gap-3">
              <h3 id="recent-inquiries-heading" className="text-lg font-semibold text-heading">
                Recent inquiries
              </h3>
              <Link to="/account/inquiries" className="text-xs font-medium text-brand-strong hover:underline">
                View all
              </Link>
            </div>

            {inquiries.isPending ? (
              <div className="mt-4 space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : inquiries.data?.length ? (
              <ul className="mt-4 divide-y divide-line">
                {inquiries.data.slice(0, 3).map((inquiry) => (
                  <li key={inquiry.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-heading">
                        {inquiry.property?.title ?? "Listing removed"}
                      </p>
                      <p className="text-xs text-muted">{formatRelativeDate(inquiry.createdAt)}</p>
                    </div>
                    <Badge variant={inquiryStatusTones[inquiry.status]}>
                      {inquiryStatusLabels[inquiry.status]}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-body">
                No inquiries yet.{" "}
                <Link to="/properties" className="font-medium text-brand-strong hover:underline">
                  Find a home
                </Link>{" "}
                to get started.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
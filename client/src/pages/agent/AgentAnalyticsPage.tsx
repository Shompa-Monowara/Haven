import { BarChart3, Eye, Inbox, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

import { StatCard } from "@/components/dashboard/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useInquiries } from "@/lib/queries/engagement";
import { useMyListings } from "@/lib/queries/properties";
import { inquiryStatusLabels, inquiryStatusTones, type InquiryStatus } from "@/types/engagement";
import { statusLabels, statusTones } from "@/types/property";

export function AgentAnalyticsPage() {
  const listings = useMyListings();
  const inquiries = useInquiries();

  const properties = listings.data ?? [];
  const leads = inquiries.data ?? [];
  const totalViews = properties.reduce((total, property) => total + property.views, 0);
  const active = properties.filter((property) => property.status === "approved");
  const openLeads = leads.filter((lead) =>
    ["new", "contacted", "qualified"].includes(lead.status),
  );

  const leadsByProperty = new Map<string, number>();
  leads.forEach((lead) => {
    if (!lead.property) return;
    leadsByProperty.set(lead.property.id, (leadsByProperty.get(lead.property.id) ?? 0) + 1);
  });

  const ranked = [...properties].sort((a, b) => b.views - a.views).slice(0, 5);
  const maxViews = Math.max(1, ...ranked.map((property) => property.views));
  const statusCounts = leads.reduce<Record<string, number>>((counts, lead) => {
    counts[lead.status] = (counts[lead.status] ?? 0) + 1;
    return counts;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[26px] font-bold leading-tight text-heading sm:text-[30px]">Analytics</h2>
          <p className="mt-1.5 text-sm text-body">
            Views, inquiries, and the listings drawing the most attention.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/agent/leads">Open leads</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total views" value={listings.isPending ? "—" : totalViews} icon={Eye} hint="Across every listing." />
        <StatCard
          label="Active listings"
          value={listings.isPending ? "—" : active.length}
          icon={BarChart3}
          hint="Approved and public."
          tone="neutral"
        />
        <StatCard
          label="Total inquiries"
          value={inquiries.isPending ? "—" : leads.length}
          icon={Inbox}
          hint="All-time buyer inquiries."
          tone="success"
        />
        <StatCard
          label="Open leads"
          value={inquiries.isPending ? "—" : openLeads.length}
          icon={TrendingUp}
          hint="New, contacted, or qualified."
          tone="warning"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="rounded-lg border border-line bg-surface p-6" aria-labelledby="top-listings-heading">
          <h3 id="top-listings-heading" className="text-lg font-semibold text-heading">
            Top listings by views
          </h3>
          {listings.isPending ? (
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : ranked.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <caption className="sr-only">Listing performance</caption>
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-[0.06em] text-muted">
                    <th scope="col" className="py-2 font-semibold">Listing</th>
                    <th scope="col" className="py-2 font-semibold">Status</th>
                    <th scope="col" className="py-2 text-right font-semibold">Views</th>
                    <th scope="col" className="py-2 text-right font-semibold">Inquiries</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((property) => {
                    const count = leadsByProperty.get(property.id) ?? 0;
                    return (
                      <tr key={property.id} className="border-b border-line last:border-0">
                        <td className="py-3">
                          <Link
                            to={`/agent/listings/${property.id}/edit`}
                            className="block max-w-[260px] truncate font-medium text-heading hover:underline"
                          >
                            {property.title}
                          </Link>
                          <span className="mt-1 block h-1.5 w-full max-w-[220px] overflow-hidden rounded-pill bg-canvas">
                            <span
                              className="block h-full rounded-pill bg-brand-strong"
                              style={{ width: `${Math.max(4, (property.views / maxViews) * 100)}%` }}
                            />
                          </span>
                        </td>
                        <td className="py-3">
                          <Badge variant={statusTones[property.status]}>
                            {statusLabels[property.status]}
                          </Badge>
                        </td>
                        <td className="py-3 text-right text-heading tabular">{property.views}</td>
                        <td className="py-3 text-right text-heading tabular">{count}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-3 text-sm text-body">
              No listings yet.{" "}
              <Link to="/agent/listings/new" className="font-medium text-brand-strong hover:underline">
                Create your first listing
              </Link>
              .
            </p>
          )}
        </section>

        <section className="rounded-lg border border-line bg-surface p-6" aria-labelledby="lead-status-heading">
          <h3 id="lead-status-heading" className="text-lg font-semibold text-heading">
            Leads by status
          </h3>
          {inquiries.isPending ? (
            <div className="mt-4 space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : leads.length ? (
            <ul className="mt-4 space-y-2">
              {(Object.keys(inquiryStatusLabels) as InquiryStatus[]).map((status) => (
                <li key={status} className="flex items-center justify-between gap-3 rounded-md bg-canvas px-3 py-2">
                  <span className="flex items-center gap-2 text-sm text-body">
                    <Badge variant={inquiryStatusTones[status]}>{inquiryStatusLabels[status]}</Badge>
                  </span>
                  <span className="text-sm font-semibold text-heading tabular">
                    {statusCounts[status] ?? 0}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-body">
              No inquiries yet. Leads appear here as buyers contact you.
            </p>
          )}
          <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-muted">
            Conversion is shown as inquiries per listing, not as a closing rate. Haven does not track
            offline sales.
          </p>
        </section>
      </div>
    </div>
  );
}
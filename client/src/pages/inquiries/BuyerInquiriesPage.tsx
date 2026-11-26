import { Inbox, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeDate } from "@/lib/format";
import { useInquiries } from "@/lib/queries/engagement";
import { contactTopicLabels } from "@/types/agent";
import { inquiryStatusLabels, inquiryStatusTones } from "@/types/engagement";

export function BuyerInquiriesPage() {
  const inquiries = useInquiries();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[26px] font-bold leading-tight text-heading sm:text-[30px]">Inquiries</h2>
          <p className="mt-1.5 text-sm text-body">
            Questions you have sent to agents, with the latest status from each conversation.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/properties">Browse homes</Link>
        </Button>
      </div>

      {inquiries.isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : inquiries.data?.length ? (
        <ul className="space-y-3">
          {inquiries.data.map((inquiry) => (
            <li key={inquiry.id} className="rounded-lg border border-line bg-surface p-4 sm:p-5">
              <div className="flex flex-wrap items-start gap-4">
                {inquiry.property?.coverUrl ? (
                  <img
                    src={inquiry.property.coverUrl}
                    alt=""
                    className="h-20 w-28 shrink-0 rounded-sm object-cover"
                  />
                ) : null}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-heading">
                      {inquiry.property?.title ??
                        (inquiry.topic ? contactTopicLabels[inquiry.topic] : "General enquiry")}
                    </h3>
                    <Badge variant={inquiryStatusTones[inquiry.status]}>
                      {inquiryStatusLabels[inquiry.status]}
                    </Badge>
                  </div>
                  {inquiry.property ? (
                    <p className="mt-1 flex items-center gap-1 text-xs text-body">
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      {inquiry.property.city ?? "Location available on request"}
                    </p>
                  ) : null}
                  <p className="mt-2 line-clamp-2 text-sm text-body">{inquiry.message}</p>
                  <p className="mt-2 text-xs text-muted">
                    Sent {formatRelativeDate(inquiry.createdAt)}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col gap-2">
                  {inquiry.conversationId ? (
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/account/messages/${inquiry.conversationId}`}>Open chat</Link>
                    </Button>
                  ) : null}
                  {inquiry.property ? (
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/properties/${inquiry.property.slug}`}>View home</Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line bg-canvas px-6 py-16 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface text-brand-strong shadow-xs">
            <Inbox className="h-5 w-5" aria-hidden="true" />
          </span>
          <h3 className="mt-3 text-lg font-semibold text-heading">No inquiries yet</h3>
          <p className="mt-1 max-w-sm text-sm text-body">
            Ask an agent about a home and the conversation will appear here.
          </p>
          <Button asChild className="mt-4">
            <Link to="/properties">Find a home</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
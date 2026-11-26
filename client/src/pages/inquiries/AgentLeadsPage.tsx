import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, MapPin, Phone, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiClientError, api } from "@/lib/api";
import { formatRelativeDate } from "@/lib/format";
import { useInquiries, useInquiriesPage } from "@/lib/queries/engagement";
import { usePageParam } from "@/lib/use-page-param";
import { cn } from "@/lib/utils";
import { contactTopicLabels } from "@/types/agent";
import {
  inquiryStatusLabels,
  inquiryStatusTones,
  type InquiryDto,
  type InquiryStatus,
} from "@/types/engagement";

const filters: Array<{ value: "all" | InquiryStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "closed", label: "Closed" },
  { value: "spam", label: "Spam" },
];

const INQUIRIES_PAGE_SIZE = 10;

export function AgentLeadsPage({
  title = "Leads",
  description = "Inquiries from buyers, with contact details, notes, and a status you can move forward.",
}: {
  title?: string;
  description?: string;
} = {}) {
  const queryClient = useQueryClient();
  const [page, setPage] = usePageParam();
  const countsQuery = useInquiries();
  const [filter, setFilter] = useState<"all" | InquiryStatus>("all");
  const [selected, setSelected] = useState<InquiryDto | null>(null);
  const [status, setStatus] = useState<InquiryStatus>("new");
  const [note, setNote] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  const allItems = countsQuery.data ?? [];
  const paged = useInquiriesPage({
    status: filter === "all" ? undefined : filter,
    page,
    limit: INQUIRIES_PAGE_SIZE,
  });
  const items = paged.data?.data ?? [];
  const meta = paged.data?.meta;

  useEffect(() => {
    if (!meta) return;
    const lastPage = Math.max(1, meta.totalPages);
    if (page > lastPage) setPage(lastPage, { replace: true });
  }, [meta, page, setPage]);

  function resetPage() {
    if (page !== 1) setPage(1);
  }

  function changeFilter(next: "all" | InquiryStatus) {
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

  function open(inquiry: InquiryDto) {
    setSelected(inquiry);
    setStatus(inquiry.status);
    setNote("");
  }

  const update = useMutation({
    mutationFn: (input: { id: string; status: InquiryStatus; note?: string }) =>
      api.patch<InquiryDto>(`/inquiries/${input.id}`, {
        status: input.status,
        note: input.note || undefined,
      }),
    onSuccess: (updated) => {
      toast.success("Lead updated");
      setSelected(updated);
      setStatus(updated.status);
      setNote("");
      void queryClient.invalidateQueries({ queryKey: ["inquiries"] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiClientError ? error.message : "The lead could not be updated");
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[26px] font-bold leading-tight text-heading sm:text-[30px]">{title}</h2>
        <p className="mt-1.5 text-sm text-body">{description}</p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter leads by status">
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
            <span className="ml-1.5 text-muted tabular">
              {option.value === "all"
                ? allItems.length
                : allItems.filter((item) => item.status === option.value).length}
            </span>
          </button>
        ))}
      </div>

      {paged.isPending ? (
        <div className="space-y-3 rounded-lg border border-line bg-surface p-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      ) : items.length ? (
        <div ref={listRef} className="overflow-hidden rounded-lg border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <caption className="sr-only">Buyer inquiries</caption>
              <thead>
                <tr className="border-b border-line bg-canvas text-xs uppercase tracking-[0.06em] text-muted">
                  <th scope="col" className="px-4 py-3 font-semibold">Buyer</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Property</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Received</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Lead</th>
                </tr>
              </thead>
              <tbody>
                {items.map((inquiry) => (
                  <tr key={inquiry.id} className="border-b border-line align-middle last:border-0">
                    <td className="px-4 py-3">
                      <p className="flex items-center gap-1.5 font-medium text-heading">
                        <span className="truncate">{inquiry.buyer?.name ?? "Guest"}</span>
                        {inquiry.buyer && inquiry.buyer.id === null ? (
                          <span className="rounded-pill bg-canvas px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.02em] text-muted">
                            Guest
                          </span>
                        ) : null}
                      </p>
                      <p className="truncate text-xs text-body">{inquiry.buyer?.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {inquiry.property ? (
                        <Link
                          to={`/properties/${inquiry.property.slug}`}
                          className="block max-w-[260px] truncate font-medium text-heading hover:underline"
                        >
                          {inquiry.property.title}
                        </Link>
                      ) : inquiry.topic ? (
                        <span className="block max-w-[260px] truncate font-medium text-heading">
                          {contactTopicLabels[inquiry.topic]}
                        </span>
                      ) : (
                        <span className="text-muted">Listing removed</span>
                      )}
                      <p className="truncate text-xs text-body">
                        {inquiry.property?.city ??
                          (inquiry.source === "agent_profile" ? "General enquiry" : "—")}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-body">{formatRelativeDate(inquiry.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={inquiryStatusTones[inquiry.status]}>
                        {inquiryStatusLabels[inquiry.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" size="sm" onClick={() => open(inquiry)}>
                        Open
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line bg-canvas px-6 py-16 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface text-brand-strong shadow-xs">
            <Users className="h-5 w-5" aria-hidden="true" />
          </span>
          <h3 className="mt-3 text-lg font-semibold text-heading">
            {allItems.length ? "No leads with this status" : "No leads yet"}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-body">
            {allItems.length
              ? "Choose another status to see more of your inquiries."
              : "Inquiries from your listings appear here with contact details and notes."}
          </p>
        </div>
      )}

      <Pagination
        page={meta?.page ?? page}
        totalPages={meta?.totalPages ?? 1}
        total={meta?.total ?? 0}
        limit={meta?.limit ?? INQUIRIES_PAGE_SIZE}
        label="Lead pages"
        onPageChange={goToPage}
      />

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-heading">
              {selected?.buyer?.name ?? "Lead"}
            </DialogTitle>
            <DialogDescription className="text-sm text-body">
              Received {selected ? formatRelativeDate(selected.createdAt) : ""}
            </DialogDescription>
          </DialogHeader>

          {selected ? (
            <div className="space-y-5">
              <div className="rounded-md border border-line bg-canvas p-3.5">
                <p className="text-xs font-semibold uppercase tracking-[0.06em] text-muted">
                  {selected.property ? "Property" : "Enquiry"}
                </p>
                {selected.property ? (
                  <>
                    <Link
                      to={`/properties/${selected.property.slug}`}
                      className="mt-1 block font-medium text-heading hover:underline"
                    >
                      {selected.property.title}
                    </Link>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-body">
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      {selected.property.city ?? "Location available on request"}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-1 block font-medium text-heading">
                      {selected.topic ? contactTopicLabels[selected.topic] : "General enquiry"}
                    </p>
                    <p className="mt-0.5 text-xs text-body">
                      Sent from this agent&apos;s public profile — no specific listing.
                    </p>
                  </>
                )}

                {selected.conversationId ? (
                  <Button asChild variant="outline" size="sm" className="mt-3 w-full sm:w-auto">
                    <Link to={`/agent/messages/${selected.conversationId}`}>
                      Open chat with buyer
                    </Link>
                  </Button>
                ) : (
                  <p className="mt-2 text-xs text-muted">
                    No chat yet — reply by email to start the conversation.
                  </p>
                )}
              </div>

              <div className="grid gap-2 text-sm">
                {selected.topic ? (
                  <p className="text-body">
                    <span className="text-muted">Topic:</span> {contactTopicLabels[selected.topic]}
                  </p>
                ) : null}
                {selected.contactMethod ? (
                  <p className="text-body">
                    <span className="text-muted">Prefers:</span>{" "}
                    {selected.contactMethod === "phone" ? "A phone call" : "Email"}
                  </p>
                ) : null}
                {selected.buyer?.email ? (
                  <a
                    href={`mailto:${selected.buyer.email}`}
                    className="flex items-center gap-2 text-brand-strong hover:underline"
                  >
                    <Mail className="h-4 w-4" aria-hidden="true" />
                    {selected.buyer.email}
                  </a>
                ) : null}
                {selected.buyer?.phone ? (
                  <a
                    href={`tel:${selected.buyer.phone}`}
                    className="flex items-center gap-2 text-brand-strong hover:underline"
                  >
                    <Phone className="h-4 w-4" aria-hidden="true" />
                    {selected.buyer.phone}
                  </a>
                ) : null}
                {selected.tourDate ? (
                  <p className="text-body">
                    Preferred tour:{" "}
                    {new Date(selected.tourDate).toLocaleDateString("en-US", {
                      dateStyle: "medium",
                    })}
                  </p>
                ) : null}
              </div>

              <blockquote className="rounded-md border-l-2 border-brand bg-canvas px-4 py-3 text-sm leading-relaxed text-body">
                {selected.message}
              </blockquote>

              {selected.notes.length ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.06em] text-muted">Notes</p>
                  <ul className="mt-2 space-y-1.5">
                    {selected.notes.map((entry, index) => (
                      <li key={`${entry}-${index}`} className="rounded-md bg-canvas px-3 py-2 text-xs text-body">
                        {entry}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="space-y-3 border-t border-line pt-4">
                <label htmlFor="lead-status" className="block text-sm font-medium text-heading">
                  Status
                </label>
                <select
                  id="lead-status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as InquiryStatus)}
                  className="h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-heading focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                >
                  {Object.entries(inquiryStatusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>

                <label htmlFor="lead-note" className="block text-sm font-medium text-heading">
                  Add a note <span className="font-normal text-muted">(optional)</span>
                </label>
                <textarea
                  id="lead-note"
                  rows={3}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Tour confirmed, waiting on financing, etc."
                  className="w-full resize-y rounded-md border border-line bg-surface px-3 py-2 text-sm text-heading placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setSelected(null)}>
                    Close
                  </Button>
                  <Button
                    type="button"
                    loading={update.isPending}
                    onClick={() =>
                      update.mutate({ id: selected.id, status, note: note.trim() || undefined })
                    }
                  >
                    Save lead
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
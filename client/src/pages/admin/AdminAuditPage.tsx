import { ScrollText } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeDate } from "@/lib/format";
import { useAdminAudit } from "@/lib/queries/admin";
import { auditActionLabels } from "@/types/admin";

function statusValue(value: unknown) {
  if (value && typeof value === "object" && "status" in value) {
    return String((value as { status: unknown }).status);
  }
  return null;
}

export function AdminAuditPage() {
  const [entity, setEntity] = useState<"" | "Property" | "User" | "AgentProfile">("");
  const [page, setPage] = useState(1);
  const audit = useAdminAudit({ entity: entity || undefined, page });
  const items = audit.data?.data ?? [];
  const meta = audit.data?.meta;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[26px] font-bold leading-tight text-heading sm:text-[30px]">
            Audit log
          </h2>
          <p className="mt-1.5 text-sm text-body">
            Every moderation action with its actor, status change, and reason.
          </p>
        </div>
        <select
          value={entity}
          onChange={(event) => {
            setEntity(event.target.value as typeof entity);
            setPage(1);
          }}
          aria-label="Filter audit entries by entity"
          className="h-10 rounded-md border border-line bg-surface px-3 text-sm text-heading"
        >
          <option value="">All entities</option>
          <option value="Property">Listings</option>
          <option value="User">Accounts</option>
          <option value="AgentProfile">Agent profiles</option>
        </select>
      </div>

      {audit.isPending ? (
        <div className="space-y-2 rounded-lg border border-line bg-surface p-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : items.length ? (
        <ol className="space-y-2">
          {items.map((entry) => {
            const before = statusValue(entry.before);
            const after = statusValue(entry.after);

            return (
              <li key={entry.id} className="rounded-lg border border-line bg-surface px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-heading">
                      {auditActionLabels[entry.action] ?? entry.action}
                    </p>
                    <p className="mt-0.5 text-xs text-body">
                      {entry.actor ? (
                        <>
                          {entry.actor.name} ({entry.actor.email})
                        </>
                      ) : (
                        "System"
                      )}{" "}
                      · {entry.entity} · {formatRelativeDate(entry.createdAt)}
                    </p>
                    {entry.reason?.note ? (
                      <p className="mt-1.5 rounded-md bg-canvas px-2.5 py-1.5 text-xs leading-relaxed text-body">
                        {entry.reason.note}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5 text-xs">
                    {before ? <Badge variant="outline">{before.replace(/_/g, " ")}</Badge> : null}
                    {before && after ? <span className="text-muted">→</span> : null}
                    {after ? <Badge variant="approved">{after.replace(/_/g, " ")}</Badge> : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="rounded-lg border border-dashed border-line bg-canvas px-6 py-16 text-center">
          <ScrollText className="mx-auto h-6 w-6 text-muted" aria-hidden="true" />
          <p className="mt-2 font-medium text-heading">No audit entries yet</p>
          <p className="mt-1 text-sm text-body">Moderation actions will appear here.</p>
        </div>
      )}

      {meta && meta.totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-body">
          <p>Page {meta.page} of {meta.totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={meta.page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
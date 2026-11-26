import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Search, ShieldCheck, UserRoundX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiClientError, api } from "@/lib/api";
import { formatRelativeDate } from "@/lib/format";
import { adminKeys, useAdminUsers } from "@/lib/queries/admin";
import { usePageParam } from "@/lib/use-page-param";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import { roleLabels } from "@/types/auth";
import type { AdminUser } from "@/types/admin";

type RoleFilter = "all" | "buyer" | "agent" | "admin";
type UserAction =
  | { type: "suspend"; user: AdminUser }
  | { type: "reactivate"; user: AdminUser }
  | null;

export function AdminUsersPage({ fixedRole }: { fixedRole?: "agent" } = {}) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [role, setRole] = useState<RoleFilter>(fixedRole ?? "all");
  const [status, setStatus] = useState<"all" | "active" | "suspended">("all");
  const [q, setQ] = useState("");
  const [page, setPage] = usePageParam();
  const [action, setAction] = useState<UserAction>(null);
  const [reason, setReason] = useState("");

  const users = useAdminUsers({
    role: role === "all" ? undefined : role,
    status: status === "all" ? undefined : status,
    q,
    page,
  });
  const items = users.data?.data ?? [];
  const meta = users.data?.meta;
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

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    void queryClient.invalidateQueries({ queryKey: adminKeys.stats });
    void queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
  }

  const update = useMutation({
    mutationFn: (input: {
      id: string;
      body: { status?: "active" | "suspended"; reason?: string; verified?: boolean };
    }) => api.patch<AdminUser>(`/admin/users/${input.id}`, input.body),
    onSuccess: (_data, variables) => {
      if (variables.body.verified !== undefined) {
        toast.success(variables.body.verified ? "Agent verified" : "Verification removed");
      } else {
        toast.success(
          variables.body.status === "suspended" ? "Account suspended" : "Account reactivated",
        );
      }
      setAction(null);
      setReason("");
      refresh();
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiClientError ? error.message : "The account could not be updated",
      );
    },
  });

  function openSuspend(user: AdminUser) {
    setReason("");
    setAction({ type: "suspend", user });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[26px] font-bold leading-tight text-heading sm:text-[30px]">
          {fixedRole === "agent" ? "Agents" : "Users"}
        </h2>
        <p className="mt-1.5 text-sm text-body">
          {fixedRole === "agent"
            ? "Verify agencies, review listing activity, and suspend accounts when needed."
            : "Manage buyer, agent, and admin accounts. Suspending an agent hides their listings."}
        </p>
      </div>

      {fixedRole ? null : (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter users by role">
          {(["all", "buyer", "agent", "admin"] as RoleFilter[]).map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={role === option}
              onClick={() => {
                setRole(option);
                resetPage();
              }}
              className={cn(
                "h-9 rounded-pill border px-3 text-xs font-medium capitalize transition-colors",
                role === option
                  ? "border-brand bg-brand-soft text-ink"
                  : "border-line bg-surface text-body hover:border-brand hover:text-heading",
              )}
            >
              {option === "all" ? "All" : `${roleLabels[option as "buyer" | "agent" | "admin"]}s`}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <Input
            value={q}
            onChange={(event) => {
              setQ(event.target.value);
              resetPage();
            }}
            placeholder="Search name or email"
            aria-label="Search users"
            className="h-10 pl-9"
          />
        </div>
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as "all" | "active" | "suspended");
            resetPage();
          }}
          aria-label="Filter by account status"
          className="h-10 rounded-md border border-line bg-surface px-3 text-sm text-heading sm:w-44"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {users.isPending ? (
        <div className="space-y-2 rounded-lg border border-line bg-surface p-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      ) : items.length ? (
        <div
          ref={listRef}
          className={cn(
            "overflow-hidden rounded-lg border border-line bg-surface",
            users.isFetching && "opacity-60 transition-opacity",
          )}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse text-left text-sm">
              <caption className="sr-only">Platform users</caption>
              <thead>
                <tr className="border-b border-line bg-canvas text-xs uppercase tracking-[0.06em] text-muted">
                  <th scope="col" className="px-4 py-3 font-semibold">Account</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Role</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Listings</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Joined</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((user) => (
                  <tr key={user.id} className="border-b border-line align-middle last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-heading">{user.name}</p>
                        {user.role === "agent" && user.verified ? (
                          <BadgeCheck className="h-4 w-4 text-brand-strong" aria-label="Verified agent" />
                        ) : null}
                      </div>
                      <p className="text-xs text-body">{user.email}</p>
                      {user.suspensionReason ? (
                        <p className="mt-1 text-xs text-danger">Suspended: {user.suspensionReason}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <p className="capitalize text-body">{user.role}</p>
                      {user.role === "agent" ? (
                        <p className="text-xs text-muted">{user.agency ?? "Independent"}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-body tabular">
                      {user.listingCount} <span className="text-xs text-muted">({user.liveListingCount} live)</span>
                    </td>
                    <td className="px-4 py-3 text-body">{formatRelativeDate(user.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          user.status === "active"
                            ? "approved"
                            : user.status === "suspended"
                              ? "rejected"
                              : "pending"
                        }
                      >
                        {user.status === "pending_approval" ? "Pending" : user.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        {user.role === "agent" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={update.isPending}
                            onClick={() =>
                              update.mutate({ id: user.id, body: { verified: !user.verified } })
                            }
                          >
                            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                            {user.verified ? "Unverify" : "Verify"}
                          </Button>
                        ) : null}
                        {user.status === "suspended" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAction({ type: "reactivate", user })}
                          >
                            Reactivate
                          </Button>
                        ) : user.id !== currentUser?.id ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-danger hover:bg-danger-tint hover:text-danger"
                            onClick={() => openSuspend(user)}
                          >
                            <UserRoundX className="h-4 w-4" aria-hidden="true" />
                            Suspend
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-line bg-canvas px-6 py-16 text-center">
          <p className="font-medium text-heading">No accounts found</p>
          <p className="mt-1 text-sm text-body">Try a different search or filter.</p>
        </div>
      )}

      <Pagination
        page={meta?.page ?? page}
        totalPages={meta?.totalPages ?? 1}
        total={meta?.total ?? 0}
        limit={meta?.limit ?? 24}
        label="User pages"
        onPageChange={goToPage}
      />

      <Dialog
        open={action?.type === "suspend"}
        onOpenChange={(open) => !open && setAction(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-heading">Suspend account</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-body">
              {action && action.type === "suspend"
                ? `${action.user.name} will be signed out and their listings will disappear from public search until the account is reactivated.`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label htmlFor="suspend-reason" className="mb-1.5 block text-sm font-medium text-heading">
                Reason
              </label>
              <textarea
                id="suspend-reason"
                rows={4}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Explain the policy issue. This is stored in the audit log."
                className="w-full resize-y rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-heading placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-line pt-4">
              <Button type="button" variant="outline" onClick={() => setAction(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                loading={update.isPending}
                onClick={() => {
                  if (!reason.trim()) {
                    toast.error("Add a reason before suspending");
                    return;
                  }
                  if (action?.type !== "suspend") return;
                  update.mutate({
                    id: action.user.id,
                    body: { status: "suspended", reason: reason.trim() },
                  });
                }}
              >
                Suspend account
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={action?.type === "reactivate"}
        onOpenChange={(open) => !open && setAction(null)}
        title="Reactivate this account?"
        description={
          action?.type === "reactivate"
            ? `${action.user.name} will be able to sign in again and their published listings will return to public search.`
            : ""
        }
        confirmLabel="Reactivate account"
        loading={update.isPending}
        onConfirm={() =>
          action?.type === "reactivate" &&
          update.mutate({ id: action.user.id, body: { status: "active" } })
        }
      />
    </div>
  );
}
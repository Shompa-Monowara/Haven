import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatRelativeDate } from "@/lib/format";
import {
  notificationKeys,
  useNotifications,
  useUnreadNotificationCount,
} from "@/lib/queries/notifications";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

export function NotificationBell({ onDark = false }: { onDark?: boolean } = {}) {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const notifications = useNotifications();
  const unread = useUnreadNotificationCount();

  const unreadCount = unread.data?.count ?? notifications.data?.unreadCount ?? 0;

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
  }

  const markRead = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: refresh,
  });

  const markAll = useMutation({
    mutationFn: () => api.post("/notifications/read-all"),
    onSuccess: refresh,
  });

  if (!user) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "relative inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors",
          onDark ? "text-white hover:bg-white/10" : "text-heading hover:bg-canvas",
        )}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-pill bg-brand-strong px-1 text-[10px] font-bold text-white tabular">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] max-w-md overflow-hidden p-0">
          <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
            <DialogHeader className="mb-0">
              <DialogTitle className="text-lg font-semibold text-heading">Notifications</DialogTitle>
              <DialogDescription className="text-xs text-body">
                Listing decisions, leads, messages, and saved-search matches.
              </DialogDescription>
            </DialogHeader>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-0.5 shrink-0"
              disabled={unreadCount === 0 || markAll.isPending}
              onClick={() => markAll.mutate()}
            >
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
              Mark all read
            </Button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {notifications.isPending ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-16 animate-pulse rounded-md bg-line/40" />
                ))}
              </div>
            ) : notifications.data?.items.length ? (
              <ul className="divide-y divide-line">
                {notifications.data.items.map((item) => {
                  const content = (
                    <span className="flex items-start gap-3">
                      <span
                        className={cn(
                          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                          item.readAt ? "bg-line" : "bg-brand-strong",
                        )}
                        aria-hidden="true"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-heading">{item.title}</span>
                        {item.body ? (
                          <span className="mt-0.5 block line-clamp-2 text-xs leading-relaxed text-body">
                            {item.body}
                          </span>
                        ) : null}
                        <span className="mt-1 block text-[11px] text-muted">
                          {formatRelativeDate(item.createdAt)}
                          {item.readAt ? "" : " · Unread"}
                        </span>
                      </span>
                    </span>
                  );

                  const handleClick = () => {
                    if (!item.readAt) markRead.mutate(item.id);
                    setOpen(false);
                  };

                  return (
                    <li key={item.id}>
                      {item.href ? (
                        <Link
                          to={item.href}
                          onClick={handleClick}
                          className={cn(
                            "block px-5 py-3.5 transition-colors hover:bg-canvas",
                            item.readAt ? "" : "bg-brand-soft/30",
                          )}
                        >
                          {content}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={handleClick}
                          className={cn(
                            "block w-full px-5 py-3.5 text-left transition-colors hover:bg-canvas",
                            item.readAt ? "" : "bg-brand-soft/30",
                          )}
                        >
                          {content}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="px-6 py-12 text-center">
                <Bell className="mx-auto h-6 w-6 text-muted" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium text-heading">You are all caught up</p>
                <p className="mt-1 text-xs text-body">
                  New leads, messages, and saved-search matches will appear here.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
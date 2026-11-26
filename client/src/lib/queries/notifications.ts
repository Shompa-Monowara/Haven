import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { NotificationList } from "@/types/notification";

export const notificationKeys = {
  all: ["notifications"] as const,
  list: ["notifications", "list"] as const,
  unread: ["notifications", "unread"] as const,
};

export function useNotifications() {
  const authenticated = useAuthStore((state) => state.status === "authenticated");

  return useQuery({
    queryKey: notificationKeys.list,
    queryFn: () => api.get<NotificationList>("/notifications?limit=30"),
    enabled: authenticated,
    refetchInterval: 30_000,
  });
}

export function useUnreadNotificationCount() {
  const authenticated = useAuthStore((state) => state.status === "authenticated");

  return useQuery({
    queryKey: notificationKeys.unread,
    queryFn: () => api.get<{ count: number }>("/notifications/unread-count"),
    enabled: authenticated,
    refetchInterval: 30_000,
  });
}
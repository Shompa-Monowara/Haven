import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { PropertySummary } from "@/types/property";
import type {
  ConversationDto,
  ConversationThread,
  InquiryDto,
  InquiryStatus,
  SavedSearchDto,
} from "@/types/engagement";

export const engagementKeys = {
  favorites: ["favorites"] as const,
  savedSearches: ["saved-searches"] as const,
  inquiries: (status?: InquiryStatus) => ["inquiries", status ?? "all"] as const,
  conversations: ["conversations"] as const,
  unread: ["conversations", "unread"] as const,
  thread: (id: string) => ["conversations", "thread", id] as const,
};

export function useFavorites() {
  const authenticated = useAuthStore((state) => state.status === "authenticated");

  return useQuery({
    queryKey: engagementKeys.favorites,
    queryFn: () => api.get<PropertySummary[]>("/favorites"),
    enabled: authenticated,
    staleTime: 60_000,
  });
}

export function useSavedSearches() {
  const authenticated = useAuthStore((state) => state.status === "authenticated");

  return useQuery({
    queryKey: engagementKeys.savedSearches,
    queryFn: () => api.get<SavedSearchDto[]>("/saved-searches"),
    enabled: authenticated,
  });
}

export function useInquiries(status?: InquiryStatus) {
  const authenticated = useAuthStore((state) => state.status === "authenticated");

  return useQuery({
    queryKey: engagementKeys.inquiries(status),
    queryFn: () => {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      params.set("limit", "60");
      return api.get<InquiryDto[]>(`/inquiries?${params.toString()}`);
    },
    enabled: authenticated,
  });
}

export function useConversations() {
  const authenticated = useAuthStore((state) => state.status === "authenticated");

  return useQuery({
    queryKey: engagementKeys.conversations,
    queryFn: () => api.get<ConversationDto[]>("/conversations"),
    enabled: authenticated,
  });
}

export function useUnreadMessageCount() {
  const authenticated = useAuthStore((state) => state.status === "authenticated");

  return useQuery({
    queryKey: engagementKeys.unread,
    queryFn: () => api.get<{ count: number }>("/conversations/unread-count"),
    enabled: authenticated,
    refetchInterval: 30_000,
  });
}

export function useConversationThread(id: string | undefined) {
  const authenticated = useAuthStore((state) => state.status === "authenticated");

  return useQuery({
    queryKey: engagementKeys.thread(id ?? ""),
    queryFn: () => api.get<ConversationThread>(`/conversations/${id}/messages`),
    enabled: Boolean(id) && authenticated,
    retry: false,
  });
}
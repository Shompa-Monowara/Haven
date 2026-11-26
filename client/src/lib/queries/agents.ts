import { useMutation, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
  ContactAgentInput,
  ContactAgentResult,
  PublicAgent,
  PublicAgentProfile,
} from "@/types/agent";

export interface PublicAgentFilters {
  q?: string;
  minListings?: number;
  verified?: boolean;
}

function agentQuery(filters: PublicAgentFilters) {
  const params = new URLSearchParams();
  const term = filters.q?.trim();
  if (term) params.set("q", term);
  if (filters.minListings !== undefined) params.set("minListings", String(filters.minListings));
  if (filters.verified) params.set("verified", "true");
  return params.toString();
}

export function usePublicAgents(filters: PublicAgentFilters = {}) {
  const query = agentQuery(filters);

  return useQuery({
    queryKey: ["agents", query],
    queryFn: () => api.get<PublicAgent[]>(`/agents${query ? `?${query}` : ""}`),
    staleTime: 60_000,
  });
}

export function usePublicAgent(id: string | undefined) {
  return useQuery({
    queryKey: ["agents", "detail", id],
    queryFn: () => api.get<PublicAgentProfile>(`/agents/${id}`),
    enabled: Boolean(id),
    retry: false,
  });
}

export function useContactAgent(agentId: string | undefined) {
  return useMutation({
    mutationFn: (input: ContactAgentInput) =>
      api.post<ContactAgentResult>(`/agents/${agentId}/contact`, input),
  });
}

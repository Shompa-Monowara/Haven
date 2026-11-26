import { create } from "zustand";

import type { AgentProfileSummary, AuthUser } from "@/types/auth";

export type AuthStatus = "loading" | "authenticated" | "guest";

interface AuthState {
  user: AuthUser | null;
  agentProfile: AgentProfileSummary | null;
  accessToken: string | null;
  status: AuthStatus;
  setSession: (user: AuthUser, agentProfile: AgentProfileSummary | null, accessToken: string | null) => void;
  updateUser: (user: AuthUser) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  agentProfile: null,
  accessToken: null,
  status: "loading",
  setSession: (user, agentProfile, accessToken) =>
    set({ user, agentProfile, accessToken, status: "authenticated" }),
  updateUser: (user) => set({ user }),
  clear: () => set({ user: null, agentProfile: null, accessToken: null, status: "guest" }),
}));
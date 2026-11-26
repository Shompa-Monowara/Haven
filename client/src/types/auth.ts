export type Role = "buyer" | "agent" | "admin";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  status: "active" | "pending_approval" | "suspended";
  avatar?: { url: string } | null;
  createdAt?: string;
}

export interface AgentProfileSummary {
  id: string;
  agency: string;
  bio: string | null;
  licenseNumber: string | null;
  verified: boolean;
  serviceAreas: string[];
  responseTimeMinutes: number;
  memberSince?: string;
}

export interface SessionPayload {
  user: AuthUser;
  agentProfile: AgentProfileSummary | null;
  accessToken?: string;
}

export function roleHome(role: Role): string {
  if (role === "admin") return "/admin";
  if (role === "agent") return "/agent";
  return "/account";
}

export const roleLabels: Record<Role, string> = {
  buyer: "Buyer",
  agent: "Agent",
  admin: "Admin",
};
import type { PropertyDetail, PropertyStatus, PropertySummary } from "./property";

export interface AuditActor {
  id: string;
  name: string;
  email: string;
  role: "buyer" | "agent" | "admin";
}

export interface AuditEntry {
  id: string;
  actor: AuditActor | null;
  action: string;
  entity: "Property" | "User" | "AgentProfile";
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason: { category: string; note: string | null } | null;
  ip: string | null;
  createdAt: string;
}

export interface AdminStats {
  kpis: {
    pendingApprovals: number;
    liveListings: number;
    newUsers: number;
    openInquiries: number;
  };
  statusCounts: Partial<Record<PropertyStatus, number>>;
  pending: PropertySummary[];
  recentActivity: AuditEntry[];
}

export interface AdminListingAgent {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  agency: string | null;
  bio: string | null;
  licenseNumber: string | null;
  verified: boolean;
  responseTimeMinutes: number;
  serviceAreas: string[];
}

export interface AdminListingDetail {
  listing: PropertyDetail;
  agent: AdminListingAgent | null;
  audit: AuditEntry[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "buyer" | "agent" | "admin";
  status: "active" | "pending_approval" | "suspended";
  createdAt: string;
  suspensionReason: string | null;
  suspendedAt: string | null;
  listingCount: number;
  liveListingCount: number;
  agency: string | null;
  verified: boolean;
}

export const auditActionLabels: Record<string, string> = {
  "property.submitted": "Submitted for review",
  "property.updated": "Listing updated",
  "property.approved": "Listing approved",
  "property.rejected": "Listing rejected",
  "property.changes_requested": "Changes requested",
  "property.archived": "Listing archived",
  "property.restored": "Listing restored",
  "user.suspended": "Account suspended",
  "user.reactivated": "Account reactivated",
  "agent.verified": "Agent verified",
  "agent.unverified": "Agent verification removed",
};
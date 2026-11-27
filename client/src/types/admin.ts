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

export interface AdminActivityPoint {
  date: string;
  listings: number;
  users: number;
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
  activityTrend?: AdminActivityPoint[];
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

export interface PlatformSettings {
  id: string | null;
  review: { standardReviewBusinessDays: number };
  notifications: {
    listingDecisionEmails: boolean;
    offlineMessageEmails: boolean;
    savedSearchDigests: boolean;
  };
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface SystemStatus {
  email: { configured: boolean };
  storage: { provider: "cloudinary" | "local" };
  environment: "development" | "test" | "production";
}

export interface PlatformSettingsPayload {
  settings: PlatformSettings;
  status: SystemStatus;
}

export interface PlatformSettingsPatch {
  review?: { standardReviewBusinessDays?: number };
  notifications?: {
    listingDecisionEmails?: boolean;
    offlineMessageEmails?: boolean;
    savedSearchDigests?: boolean;
  };
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
  "settings.update": "Settings updated",
};
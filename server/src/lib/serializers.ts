import type { AgentProfileDocument } from "../models/agent-profile.model";
import type { UserDocument } from "../models/user.model";

export function toUserDto(user: UserDocument) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? null,
    role: user.role,
    status: user.status,
    avatar: user.avatar?.url ? { url: user.avatar.url } : null,
    createdAt: user.createdAt,
  };
}

export function toAgentProfileDto(profile: AgentProfileDocument) {
  return {
    id: profile.id,
    agency: profile.agency,
    bio: profile.bio ?? null,
    licenseNumber: profile.licenseNumber ?? null,
    verified: profile.verified,
    serviceAreas: profile.serviceAreas,
    responseTimeMinutes: profile.responseTimeMinutes,
    memberSince: profile.createdAt,
  };
}
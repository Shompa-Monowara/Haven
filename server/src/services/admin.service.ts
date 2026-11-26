import type { Request } from "express";
import { Types } from "mongoose";

import { ApiError } from "../lib/api-error";
import { disconnectUser } from "../lib/realtime";
import { getOwnerProperty, serializeDetail, summarizeProperties } from "./property.service";
import { AuditLogModel, type AuditLogDocument } from "../models/audit-log.model";
import { AgentProfileModel } from "../models/agent-profile.model";
import { InquiryModel } from "../models/inquiry.model";
import { PropertyModel } from "../models/property.model";
import { UserModel, type UserDocument } from "../models/user.model";
import type { adminUserQuerySchema } from "../validation/admin.schemas";
import { z } from "zod";

type UserQuery = z.infer<typeof adminUserQuerySchema>;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function auditDtos(logs: AuditLogDocument[]) {
  if (!logs.length) return [];

  const actorIds = [...new Set(logs.map((log) => log.actor.toString()))];
  const actors = await UserModel.find({ _id: { $in: actorIds } }).select("name email role");
  const actorMap = new Map(actors.map((actor) => [actor.id, actor]));

  return logs.map((log) => {
    const actor = actorMap.get(log.actor.toString());
    return {
      id: log.id,
      actor: actor
        ? { id: actor.id, name: actor.name, email: actor.email, role: actor.role }
        : null,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId.toString(),
      before: log.before ?? null,
      after: log.after ?? null,
      reason: log.reason?.category
        ? { category: log.reason.category, note: log.reason.note ?? null }
        : null,
      ip: log.ip ?? null,
      createdAt: log.createdAt,
    };
  });
}

async function usersWithDetails(users: UserDocument[]) {
  if (!users.length) return [];

  const ids = users.map((user) => user._id);
  const [profiles, counts] = await Promise.all([
    AgentProfileModel.find({ user: { $in: ids } }),
    PropertyModel.aggregate<{ _id: string; total: number; live: number }>([
      { $match: { agent: { $in: ids } } },
      {
        $group: {
          _id: "$agent",
          total: { $sum: 1 },
          live: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
        },
      },
    ]),
  ]);

  const profileMap = new Map(profiles.map((profile) => [profile.user.toString(), profile]));
  const countMap = new Map(counts.map((row) => [String(row._id), row]));

  return users.map((user) => {
    const profile = profileMap.get(user.id);
    const count = countMap.get(user.id);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone ?? null,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      suspensionReason: user.suspensionReason ?? null,
      suspendedAt: user.suspendedAt ?? null,
      listingCount: count?.total ?? 0,
      liveListingCount: count?.live ?? 0,
      agency: profile?.agency ?? null,
      verified: profile?.verified ?? false,
    };
  });
}

export async function adminStats() {
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);

  const [pendingApprovals, liveListings, newUsers, openInquiries, pending, logs, statusRows] =
    await Promise.all([
      PropertyModel.countDocuments({ status: "pending" }),
      PropertyModel.countDocuments({ status: "approved", hiddenBySuspension: { $ne: true } }),
      UserModel.countDocuments({ createdAt: { $gte: weekAgo } }),
      InquiryModel.countDocuments({ status: { $in: ["new", "contacted", "qualified"] } }),
      PropertyModel.find({ status: "pending" })
        .sort({ submittedAt: 1 })
        .limit(5),
      AuditLogModel.find().sort({ createdAt: -1 }).limit(6),
      PropertyModel.aggregate<{ _id: string; count: number }>([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

  const statusCounts = Object.fromEntries(
    statusRows.map((row) => [row._id, row.count]),
  ) as Record<string, number>;

  return {
    kpis: { pendingApprovals, liveListings, newUsers, openInquiries },
    statusCounts,
    pending: await summarizeProperties(pending),
    recentActivity: await auditDtos(logs),
  };
}

export async function getAdminListing(id: string, adminId: string) {
  const { property, agent } = await getOwnerProperty(id, { id: adminId, role: "admin" });
  const [profile, user, logs] = await Promise.all([
    AgentProfileModel.findOne({ user: property.agent }),
    UserModel.findById(property.agent).select("name email phone"),
    AuditLogModel.find({ entity: "Property", entityId: property._id })
      .sort({ createdAt: -1 })
      .limit(30),
  ]);

  return {
    listing: serializeDetail(property, agent),
    agent: user
      ? {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone ?? null,
          agency: profile?.agency ?? null,
          bio: profile?.bio ?? null,
          licenseNumber: profile?.licenseNumber ?? null,
          verified: profile?.verified ?? false,
          responseTimeMinutes: profile?.responseTimeMinutes ?? 120,
          serviceAreas: profile?.serviceAreas ?? [],
        }
      : null,
    audit: await auditDtos(logs),
  };
}

export async function listAdminUsers(query: UserQuery) {
  const filter: Record<string, unknown> = {};
  if (query.role) filter.role = query.role;
  if (query.status) filter.status = query.status;
  if (query.q) {
    const term = new RegExp(escapeRegex(query.q), "i");
    filter.$or = [{ name: term }, { email: term }];
  }

  const skip = (query.page - 1) * query.limit;
  const [total, users] = await Promise.all([
    UserModel.countDocuments(filter),
    UserModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit),
  ]);

  return {
    items: await usersWithDetails(users),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function updateAdminUser(
  adminId: string,
  userId: string,
  input: { status?: "active" | "suspended"; reason?: string; verified?: boolean },
  request: Request,
) {
  const user = await UserModel.findById(userId);
  if (!user) throw ApiError.notFound("That user could not be found");
  if (user.id === adminId && input.status === "suspended") {
    throw ApiError.badRequest("You cannot suspend your own account");
  }

  if (input.status) {
    if (input.status === "suspended" && !input.reason?.trim()) {
      throw ApiError.badRequest("Add a reason before suspending this account");
    }

    const before = user.status;
    user.status = input.status;
    user.suspendedAt = input.status === "suspended" ? new Date() : undefined;
    user.suspendedBy =
      input.status === "suspended" ? new Types.ObjectId(adminId) : undefined;
    user.suspensionReason = input.status === "suspended" ? input.reason : undefined;
    await user.save();

    await PropertyModel.updateMany(
      { agent: user._id },
      { $set: { hiddenBySuspension: input.status === "suspended" } },
    );

    if (input.status === "suspended") {
      disconnectUser(user.id);
    }

    await AuditLogModel.create({
      actor: adminId,
      action: input.status === "suspended" ? "user.suspended" : "user.reactivated",
      entity: "User",
      entityId: user._id,
      before: { status: before },
      after: { status: user.status },
      reason: input.reason ? { category: "moderation", note: input.reason } : undefined,
      ip: request.ip,
    });
  }

  if (input.verified !== undefined) {
    if (user.role !== "agent") {
      throw ApiError.badRequest("Only agent accounts can be verified");
    }

    const profile = await AgentProfileModel.findOneAndUpdate(
      { user: user._id },
      { $set: { verified: input.verified } },
      { new: true },
    );

    if (!profile) {
      await AgentProfileModel.create({
        user: user._id,
        agency: "Independent",
        verified: input.verified,
      });
    }

    await AuditLogModel.create({
      actor: adminId,
      action: input.verified ? "agent.verified" : "agent.unverified",
      entity: "AgentProfile",
      entityId: user._id,
      before: { verified: !input.verified },
      after: { verified: input.verified },
      ip: request.ip,
    });
  }

  const [dto] = await usersWithDetails([user]);
  return dto;
}

export async function listAdminAudit(query: {
  entity?: "Property" | "User" | "AgentProfile";
  page: number;
  limit: number;
}) {
  const filter: Record<string, unknown> = {};
  if (query.entity) filter.entity = query.entity;

  const skip = (query.page - 1) * query.limit;
  const [total, logs] = await Promise.all([
    AuditLogModel.countDocuments(filter),
    AuditLogModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit),
  ]);

  return {
    items: await auditDtos(logs),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}
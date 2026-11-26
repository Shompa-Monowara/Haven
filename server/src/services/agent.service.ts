import { ApiError } from "../lib/api-error";
import { AgentProfileModel } from "../models/agent-profile.model";
import { PropertyModel } from "../models/property.model";
import { UserModel } from "../models/user.model";
import { summarizeProperties } from "./property.service";

async function agentDtos() {
  const users = await UserModel.find({ role: "agent", status: "active" }).select(
    "name avatar lastLoginAt updatedAt",
  );
  const profiles = await AgentProfileModel.find({ user: { $in: users.map((user) => user._id) } });
  const profileMap = new Map(profiles.map((profile) => [profile.user.toString(), profile]));

  const counts = await PropertyModel.aggregate<{ _id: string; count: number }>([
    {
      $match: {
        agent: { $in: users.map((user) => user._id) },
        status: "approved",
        hiddenBySuspension: { $ne: true },
      },
    },
    { $group: { _id: "$agent", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((row) => [String(row._id), row.count]));

  return users.map((user) => {
    const profile = profileMap.get(user.id);
    return {
      id: user.id,
      name: user.name,
      avatar: user.avatar?.url ?? null,
      agency: profile?.agency ?? "Independent",
      bio: profile?.bio ?? null,
      verified: profile?.verified ?? false,
      responseTimeMinutes: profile?.responseTimeMinutes ?? 120,
      serviceAreas: profile?.serviceAreas ?? [],
      listingCount: countMap.get(user.id) ?? 0,
      // Recency signal for the directory's "Recently active" sort. Falls back to
      // the account's last update when the agent has never signed in.
      lastActiveAt: (user.lastLoginAt ?? user.updatedAt ?? new Date()).toISOString(),
    };
  });
}

export interface PublicAgentFilters {
  q?: string;
  verified?: boolean;
  minListings?: number;
}

export async function listPublicAgents(options: PublicAgentFilters = {}) {
  const agents = await agentDtos();
  const term = options.q?.trim().toLowerCase();

  let filtered = term
    ? agents.filter((agent) =>
        [agent.name, agent.agency, ...agent.serviceAreas]
          .join(" ")
          .toLowerCase()
          .includes(term),
      )
    : agents;

  if (options.verified) {
    filtered = filtered.filter((agent) => agent.verified);
  }

  if (options.minListings !== undefined) {
    const minListings = options.minListings;
    filtered = filtered.filter((agent) => agent.listingCount >= minListings);
  }

  return filtered.sort(
    (a, b) =>
      Number(Boolean(b.avatar)) - Number(Boolean(a.avatar)) ||
      Number(b.verified) - Number(a.verified) ||
      b.listingCount - a.listingCount,
  );
}

export async function getPublicAgent(id: string) {
  if (!/^[a-f0-9]{24}$/i.test(id)) throw ApiError.notFound("That agent could not be found");

  const agents = await agentDtos();
  const agent = agents.find((entry) => entry.id === id);
  if (!agent) throw ApiError.notFound("That agent could not be found");

  const properties = await PropertyModel.find({
    agent: id,
    status: "approved",
    hiddenBySuspension: { $ne: true },
  })
    .sort({ publishedAt: -1 })
    .limit(12);

  return {
    agent,
    listings: await summarizeProperties(properties),
  };
}
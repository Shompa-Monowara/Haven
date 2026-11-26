import { Router } from "express";
import { z } from "zod";

import { env } from "../config/env";
import { ApiError } from "../lib/api-error";
import { asyncHandler } from "../lib/async-handler";
import { logger } from "../lib/logger";
import {
  sendAgentContactEmail,
  sendContactConfirmationEmail,
} from "../lib/email";
import { optionalAuth } from "../middleware/auth";
import { keyedRateLimit } from "../middleware/rate-limit";
import { AgentProfileModel } from "../models/agent-profile.model";
import { InquiryModel, INQUIRY_TOPIC_LABELS } from "../models/inquiry.model";
import { PropertyModel } from "../models/property.model";
import { UserModel } from "../models/user.model";
import { getPublicAgent, listPublicAgents } from "../services/agent.service";
import { createNotification } from "../services/notification.service";
import { contactAgentSchema } from "../validation/engagement.schemas";

export const agentRouter = Router();

const querySchema = z.object({
  q: z.string().trim().max(120).optional(),
  verified: z.enum(["true", "false"]).optional(),
  minListings: z.coerce.number().int().min(0).optional(),
});

agentRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = querySchema.parse(req.query);
    res.json({
      data: await listPublicAgents({
        q: query.q,
        verified: query.verified === undefined ? undefined : query.verified === "true",
        minListings: query.minListings,
      }),
    });
  }),
);

const CONTACT_WINDOW_MS = 15 * 60 * 1000;
const CONTACT_RATE_LIMIT = 5;
const CONTACT_RATE_MESSAGE = "Too many messages, try again in a few minutes";

const contactIpLimiter = keyedRateLimit({
  windowMs: CONTACT_WINDOW_MS,
  limit: CONTACT_RATE_LIMIT,
  key: (req) => req.ip ?? "unknown",
  message: CONTACT_RATE_MESSAGE,
});

const contactEmailLimiter = keyedRateLimit({
  windowMs: CONTACT_WINDOW_MS,
  limit: CONTACT_RATE_LIMIT,
  key: (req) => {
    const email = (req.body as { email?: unknown } | undefined)?.email;
    return typeof email === "string" && email.trim() ? email.trim().toLowerCase() : "unknown";
  },
  message: CONTACT_RATE_MESSAGE,
});

function sanitizeText(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

agentRouter.post(
  "/:id/contact",
  contactIpLimiter,
  contactEmailLimiter,
  optionalAuth,
  asyncHandler(async (req, res) => {
    const agentId = req.params.id;

    if (!/^[a-f0-9]{24}$/i.test(agentId)) {
      throw ApiError.notFound("That agent could not be found");
    }

    // Honeypot tripped: answer with a normal 201 without validating or storing.
    const honeypot = (req.body as { website?: unknown } | undefined)?.website;
    if (typeof honeypot === "string" && honeypot.trim()) {
      res.status(201).json({
        data: { id: null, status: "new", responseTimeMinutes: 120 },
      });
      return;
    }

    const payload = contactAgentSchema.parse(req.body);

    const agent = await UserModel.findOne({
      _id: agentId,
      role: "agent",
      status: "active",
    }).select("name email");

    const profile = agent
      ? await AgentProfileModel.findOne({ user: agent._id }).select("verified responseTimeMinutes")
      : null;

    if (!agent || !profile?.verified) {
      throw ApiError.notFound("That agent is not available");
    }

    if (req.auth?.id === agent.id) {
      throw ApiError.badRequest("You cannot send an enquiry to yourself");
    }

    let relatedProperty: { id: string; title: string } | null = null;

    if (payload.propertyId) {
      const property = await PropertyModel.findOne({
        _id: payload.propertyId,
        agent: agent._id,
        status: "approved",
        hiddenBySuspension: { $ne: true },
      }).select("title");

      if (!property) {
        throw ApiError.badRequest("That listing is not available from this agent");
      }

      relatedProperty = { id: property.id, title: property.title };
    }

    const message = sanitizeText(payload.message);
    const responseTimeMinutes = profile.responseTimeMinutes ?? 120;

    const inquiry = await InquiryModel.create({
      property: relatedProperty?.id,
      buyer: req.auth?.id,
      agent: agent._id,
      name: sanitizeText(payload.name),
      email: payload.email,
      phone: payload.phone ? sanitizeText(payload.phone) : undefined,
      message,
      consent: payload.consent,
      topic: payload.topic,
      contactMethod: payload.contactMethod,
      source: "agent_profile",
      status: "new",
    });

    const topicLabel = INQUIRY_TOPIC_LABELS[payload.topic];

    // Best-effort follow-up: the enquiry is saved already, so a notification or
    // email failure must not fail the request or invite a duplicate retry.
    try {
      await createNotification({
        user: agent.id,
        type: "inquiry",
        title: `New enquiry from ${sanitizeText(payload.name)}`,
        body: `${topicLabel}${relatedProperty ? ` · ${relatedProperty.title}` : ""} — sent from your public profile.`,
        href: "/agent/leads",
      });

      await Promise.all([
        sendAgentContactEmail({
          to: agent.email,
          agentName: agent.name,
          senderName: sanitizeText(payload.name),
          senderEmail: payload.email,
          senderPhone: payload.phone ? sanitizeText(payload.phone) : undefined,
          topicLabel,
          contactMethod: payload.contactMethod,
          propertyTitle: relatedProperty?.title,
          message,
          leadsUrl: `${env.CORS_ORIGIN}/agent/leads`,
        }),
        sendContactConfirmationEmail({
          to: payload.email,
          senderName: sanitizeText(payload.name),
          agentName: agent.name,
          firstName: agent.name.split(" ")[0] ?? agent.name,
          responseTimeMinutes,
          profileUrl: `${env.CORS_ORIGIN}/agents/${agent.id}`,
        }),
      ]);
    } catch (error) {
      logger.error({ err: error, inquiryId: inquiry.id }, "Contact enquiry follow-up failed");
    }

    res.status(201).json({
      data: {
        id: inquiry.id,
        status: inquiry.status,
        responseTimeMinutes,
      },
    });
  }),
);

agentRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json({ data: await getPublicAgent(req.params.id) });
  }),
);

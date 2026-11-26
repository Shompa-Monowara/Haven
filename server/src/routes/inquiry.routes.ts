import { Router } from "express";
import rateLimit from "express-rate-limit";

import { env } from "../config/env";
import { ApiError } from "../lib/api-error";
import { asyncHandler } from "../lib/async-handler";
import { requireAuth, requireRole } from "../middleware/auth";
import { AgentProfileModel } from "../models/agent-profile.model";
import { InquiryModel } from "../models/inquiry.model";
import { PropertyModel } from "../models/property.model";
import { listInquiries, updateInquiry } from "../services/inquiry.service";
import { createNotification } from "../services/notification.service";
import { inquiryListQuerySchema, inquiryUpdateSchema } from "../validation/engagement.schemas";
import { inquirySchema } from "../validation/property.schemas";

export const inquiryRouter = Router();

const inquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
});

inquiryRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const query = inquiryListQuerySchema.parse(req.query);
    const result = await listInquiries(req.auth!, query);
    res.json({ data: result.items, meta: result.meta });
  }),
);

inquiryRouter.patch(
  "/:id",
  requireAuth,
  requireRole("agent", "admin"),
  asyncHandler(async (req, res) => {
    const payload = inquiryUpdateSchema.parse(req.body);
    res.json({ data: await updateInquiry(req.auth!, req.params.id, payload) });
  }),
);

inquiryRouter.post(
  "/",
  requireAuth,
  inquiryLimiter,
  asyncHandler(async (req, res) => {
    const payload = inquirySchema.parse(req.body);

    const property = await PropertyModel.findById(payload.propertyId).select("agent status title");

    if (!property || property.status !== "approved") {
      throw ApiError.notFound("That listing is not available for inquiries");
    }

    if (property.agent.toString() === req.auth!.id) {
      throw ApiError.badRequest("You cannot send an inquiry about your own listing");
    }

    const existing = await InquiryModel.findOne({
      property: property._id,
      buyer: req.auth!.id,
      status: { $in: ["new", "contacted", "qualified"] },
    }).select("_id");

    if (existing) {
      throw ApiError.conflict("You already have an open inquiry for this home");
    }

    const inquiry = await InquiryModel.create({
      property: property._id,
      buyer: req.auth!.id,
      agent: property.agent,
      name: payload.name,
      email: payload.email,
      phone: payload.phone || undefined,
      message: payload.message,
      tourDate: payload.tourDate ? new Date(payload.tourDate) : undefined,
      consent: payload.consent,
      status: "new",
    });

    const profile = await AgentProfileModel.findOne({ user: property.agent }).select(
      "responseTimeMinutes",
    );

    await createNotification({
      user: property.agent.toString(),
      type: "inquiry",
      title: "New property inquiry",
      body: `${payload.name} asked about ${property.title}.`,
      href: "/agent/leads",
    });

    res.status(201).json({
      data: {
        id: inquiry.id,
        status: inquiry.status,
        responseTimeMinutes: profile?.responseTimeMinutes ?? 120,
      },
    });
  }),
);
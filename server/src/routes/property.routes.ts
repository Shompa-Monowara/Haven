import { Router } from "express";
import { z } from "zod";

import { asyncHandler } from "../lib/async-handler";
import { optionalAuth, requireAuth, requireRole } from "../middleware/auth";
import {
  archiveProperty,
  bulkApproveProperties,
  createDraft,
  decideProperty,
  deleteDraft,
  getOwnerProperty,
  getPropertyBySlug,
  listAdminProperties,
  listAgentProperties,
  listPublicProperties,
  listSimilarProperties,
  restoreProperty,
  serializeDetail,
  submitProperty,
  updateProperty,
} from "../services/property.service";
import {
  PROPERTY_STATUSES,
  adminDecisionSchema,
  createPropertySchema,
  propertyListQuerySchema,
  updatePropertySchema,
} from "../validation/property.schemas";
import { bulkApproveSchema } from "../validation/admin.schemas";
import { getAdminListing } from "../services/admin.service";

export const propertyRouter = Router();
export const adminPropertyRouter = Router();

async function ownerResponse(id: string, viewer: { id: string; role: "buyer" | "agent" | "admin" }) {
  const { property, agent } = await getOwnerProperty(id, viewer);
  return serializeDetail(property, agent);
}

propertyRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = propertyListQuerySchema.parse(req.query);
    const { items, meta } = await listPublicProperties(query);
    res.json({ data: items, meta });
  }),
);

propertyRouter.get(
  "/mine",
  requireAuth,
  requireRole("agent", "admin"),
  asyncHandler(async (req, res) => {
    const items = await listAgentProperties(req.auth!.id);
    res.json({ data: items });
  }),
);

propertyRouter.get(
  "/mine/:id",
  requireAuth,
  requireRole("agent", "admin"),
  asyncHandler(async (req, res) => {
    res.json({ data: await ownerResponse(req.params.id, req.auth!) });
  }),
);

propertyRouter.post(
  "/",
  requireAuth,
  requireRole("agent", "admin"),
  asyncHandler(async (req, res) => {
    const payload = createPropertySchema.parse(req.body);
    const property = await createDraft(req.auth!.id, payload);
    res.status(201).json({ data: await ownerResponse(property.id, req.auth!) });
  }),
);

propertyRouter.get(
  "/:slug/similar",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { property } = await getPropertyBySlug(req.params.slug, req.auth ?? null, {
      countView: false,
    });
    const items = await listSimilarProperties(property);
    res.json({ data: items });
  }),
);

propertyRouter.get(
  "/:slug",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { property, agent } = await getPropertyBySlug(req.params.slug, req.auth ?? null);
    res.json({ data: serializeDetail(property, agent) });
  }),
);

propertyRouter.patch(
  "/:id",
  requireAuth,
  requireRole("agent", "admin"),
  asyncHandler(async (req, res) => {
    const payload = updatePropertySchema.parse(req.body);
    const { property } = await getOwnerProperty(req.params.id, req.auth!);
    const updated = await updateProperty(property, payload, req.auth!, req);
    res.json({ data: await ownerResponse(updated.id, req.auth!) });
  }),
);

propertyRouter.post(
  "/:id/submit",
  requireAuth,
  requireRole("agent", "admin"),
  asyncHandler(async (req, res) => {
    const { property } = await getOwnerProperty(req.params.id, req.auth!);
    const submitted = await submitProperty(property, req.auth!, req);
    res.json({ data: await ownerResponse(submitted.id, req.auth!) });
  }),
);

propertyRouter.post(
  "/:id/archive",
  requireAuth,
  requireRole("agent", "admin"),
  asyncHandler(async (req, res) => {
    const { property } = await getOwnerProperty(req.params.id, req.auth!);
    const archived = await archiveProperty(property, req.auth!, req);
    res.json({ data: await ownerResponse(archived.id, req.auth!) });
  }),
);

propertyRouter.delete(
  "/:id",
  requireAuth,
  requireRole("agent", "admin"),
  asyncHandler(async (req, res) => {
    const { property } = await getOwnerProperty(req.params.id, req.auth!);
    await deleteDraft(property, req.auth!);
    res.status(204).end();
  }),
);

adminPropertyRouter.get(
  "/listings",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const query = propertyListQuerySchema.parse(req.query);
    const status = z.enum(PROPERTY_STATUSES).optional().parse(req.query.status);
    const { items, meta } = await listAdminProperties(query, status);
    res.json({ data: items, meta });
  }),
);

adminPropertyRouter.get(
  "/listings/:id",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    res.json({ data: await getAdminListing(req.params.id, req.auth!.id) });
  }),
);

adminPropertyRouter.post(
  "/listings/bulk-approve",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const payload = bulkApproveSchema.parse(req.body);
    res.json({ data: await bulkApproveProperties(payload.ids, req.auth!.id, req) });
  }),
);

adminPropertyRouter.post(
  "/listings/:id/archive",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { property } = await getOwnerProperty(req.params.id, req.auth!);
    await archiveProperty(property, req.auth!, req);
    res.json({ data: await ownerResponse(property.id, req.auth!) });
  }),
);

adminPropertyRouter.post(
  "/listings/:id/restore",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { property } = await getOwnerProperty(req.params.id, req.auth!);
    await restoreProperty(property, req.auth!.id, req);
    res.json({ data: await ownerResponse(property.id, req.auth!) });
  }),
);

adminPropertyRouter.patch(
  "/listings/:id/status",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const payload = adminDecisionSchema.parse(req.body);
    const { property } = await getOwnerProperty(req.params.id, req.auth!);

    await decideProperty(property, req.auth!.id, payload, req);
    res.json({ data: await ownerResponse(property.id, req.auth!) });
  }),
);
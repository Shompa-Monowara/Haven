import { Router } from "express";

import { asyncHandler } from "../lib/async-handler";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  createSavedSearch,
  deleteSavedSearch,
  listSavedSearches,
  runSavedSearchDigests,
  updateSavedSearch,
} from "../services/saved-search.service";
import {
  savedSearchCreateSchema,
  savedSearchUpdateSchema,
} from "../validation/engagement.schemas";

export const savedSearchRouter = Router();

savedSearchRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ data: await listSavedSearches(req.auth!.id) });
  }),
);

savedSearchRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = savedSearchCreateSchema.parse(req.body);
    res.status(201).json({ data: await createSavedSearch(req.auth!.id, payload) });
  }),
);

savedSearchRouter.post(
  "/digests/run",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const force = req.query.force === "true";
    res.json({ data: await runSavedSearchDigests({ force }) });
  }),
);

savedSearchRouter.patch(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = savedSearchUpdateSchema.parse(req.body);
    res.json({ data: await updateSavedSearch(req.auth!.id, req.params.id, payload) });
  }),
);

savedSearchRouter.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    await deleteSavedSearch(req.auth!.id, req.params.id);
    res.status(204).end();
  }),
);
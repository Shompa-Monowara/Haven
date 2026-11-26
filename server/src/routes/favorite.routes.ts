import { Router } from "express";

import { asyncHandler } from "../lib/async-handler";
import { requireAuth } from "../middleware/auth";
import {
  addFavorite,
  favoriteIds,
  listFavorites,
  removeFavorite,
} from "../services/favorite.service";

export const favoriteRouter = Router();

favoriteRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const items = await listFavorites(req.auth!.id);
    res.json({ data: items });
  }),
);

favoriteRouter.get(
  "/ids",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ data: await favoriteIds(req.auth!.id) });
  }),
);

favoriteRouter.post(
  "/:propertyId",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await addFavorite(req.auth!.id, req.params.propertyId) });
  }),
);

favoriteRouter.delete(
  "/:propertyId",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ data: await removeFavorite(req.auth!.id, req.params.propertyId) });
  }),
);
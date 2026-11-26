import { Router } from "express";
import { z } from "zod";

import { asyncHandler } from "../lib/async-handler";
import {
  listCityCounts,
  listNeighborhoodCounts,
  listPropertyTypeCounts,
} from "../services/property.service";

export const locationRouter = Router();

locationRouter.get(
  "/cities",
  asyncHandler(async (_req, res) => {
    const cities = await listCityCounts();
    res.json({ data: cities });
  }),
);

locationRouter.get(
  "/property-types",
  asyncHandler(async (_req, res) => {
    res.json({ data: await listPropertyTypeCounts() });
  }),
);

const neighborhoodQuerySchema = z.object({
  city: z.string().trim().min(1).max(80),
});

locationRouter.get(
  "/neighborhoods",
  asyncHandler(async (req, res) => {
    const query = neighborhoodQuerySchema.parse(req.query);
    res.json({ data: await listNeighborhoodCounts(query.city) });
  }),
);
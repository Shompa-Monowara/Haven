import { Router } from "express";

import { asyncHandler } from "../lib/async-handler";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  adminStats,
  listAdminAudit,
  listAdminUsers,
  updateAdminUser,
} from "../services/admin.service";
import {
  adminAuditQuerySchema,
  adminUserQuerySchema,
  adminUserUpdateSchema,
} from "../validation/admin.schemas";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole("admin"));

adminRouter.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    res.json({ data: await adminStats() });
  }),
);

adminRouter.get(
  "/users",
  asyncHandler(async (req, res) => {
    const query = adminUserQuerySchema.parse(req.query);
    const result = await listAdminUsers(query);
    res.json({ data: result.items, meta: result.meta });
  }),
);

adminRouter.patch(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const payload = adminUserUpdateSchema.parse(req.body);
    res.json({ data: await updateAdminUser(req.auth!.id, req.params.id, payload, req) });
  }),
);

adminRouter.get(
  "/audit",
  asyncHandler(async (req, res) => {
    const query = adminAuditQuerySchema.parse(req.query);
    const result = await listAdminAudit(query);
    res.json({ data: result.items, meta: result.meta });
  }),
);
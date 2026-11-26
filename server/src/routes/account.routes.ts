import { Router } from "express";

import { ApiError } from "../lib/api-error";
import { asyncHandler } from "../lib/async-handler";
import { clearRefreshCookie } from "../lib/cookies";
import { toUserDto } from "../lib/serializers";
import { requireAuth } from "../middleware/auth";
import { UserModel } from "../models/user.model";
import { hashPassword, revokeAllSessions, verifyPassword } from "../services/auth.service";
import { changePasswordSchema, updateProfileSchema } from "../validation/auth.schemas";

export const accountRouter = Router();

accountRouter.use(requireAuth);

accountRouter.patch(
  "/profile",
  asyncHandler(async (req, res) => {
    const payload = updateProfileSchema.parse(req.body);

    const user = await UserModel.findById(req.auth?.id);

    if (!user) {
      throw ApiError.unauthorized();
    }

    user.name = payload.name;
    user.phone = payload.phone || undefined;

    await user.save();

    res.json({ data: { user: toUserDto(user) } });
  }),
);

accountRouter.patch(
  "/password",
  asyncHandler(async (req, res) => {
    const payload = changePasswordSchema.parse(req.body);

    const user = await UserModel.findById(req.auth?.id).select("+passwordHash");

    if (!user) {
      throw ApiError.unauthorized();
    }

    if (!(await verifyPassword(payload.currentPassword, user.passwordHash))) {
      throw ApiError.badRequest("Your current password is incorrect");
    }

    user.passwordHash = await hashPassword(payload.newPassword);
    await user.save();

    await revokeAllSessions(user.id);
    clearRefreshCookie(res);

    res.json({
      data: { message: "Password updated. Sign in again on your other devices." },
    });
  }),
);
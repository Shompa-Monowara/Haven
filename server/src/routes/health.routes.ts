import { Router } from "express";

import { databaseStatus } from "../config/db";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({
    data: {
      status: "ok",
      uptimeSeconds: Math.round(process.uptime()),
      database: databaseStatus(),
      timestamp: new Date().toISOString(),
    },
  });
});
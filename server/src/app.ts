import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";

import { env } from "./config/env";
import { logger } from "./lib/logger";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { requestId } from "./middleware/request-id";
import { accountRouter } from "./routes/account.routes";
import { adminRouter } from "./routes/admin.routes";
import { agentRouter } from "./routes/agent.routes";
import { authRouter } from "./routes/auth.routes";
import { conversationRouter } from "./routes/conversation.routes";
import { favoriteRouter } from "./routes/favorite.routes";
import { healthRouter } from "./routes/health.routes";
import { inquiryRouter } from "./routes/inquiry.routes";
import { locationRouter } from "./routes/location.routes";
import { notificationRouter } from "./routes/notification.routes";
import { adminPropertyRouter, propertyRouter } from "./routes/property.routes";
import { savedSearchRouter } from "./routes/saved-search.routes";
import { seoRouter } from "./routes/seo.routes";
import { UPLOAD_ROOT, uploadRouter } from "./routes/upload.routes";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");

  // Behind a reverse proxy, req.ip is the proxy address unless Express is told
  // how much to trust. Without this, IP-keyed rate limiting (contact endpoint)
  // would bucket every visitor together.
  if (env.TRUST_PROXY) {
    const hops = Number(env.TRUST_PROXY);
    app.set(
      "trust proxy",
      env.TRUST_PROXY === "true" ? true : Number.isInteger(hops) ? hops : env.TRUST_PROXY,
    );
  }

  app.use(requestId);
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
      credentials: true,
    }),
  );
  app.use(pinoHttp({ logger }));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));
  app.use(cookieParser());

  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/account", accountRouter);
  app.use("/api/properties", propertyRouter);
  app.use("/api/locations", locationRouter);
  app.use("/api/agents", agentRouter);
  app.use("/api/inquiries", inquiryRouter);
  app.use("/api/favorites", favoriteRouter);
  app.use("/api/saved-searches", savedSearchRouter);
  app.use("/api/conversations", conversationRouter);
  app.use("/api/notifications", notificationRouter);
  app.use("/api/uploads", uploadRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/admin", adminPropertyRouter);

  app.use(
    "/uploads",
    express.static(UPLOAD_ROOT, {
      index: false,
      dotfiles: "deny",
      maxAge: "30d",
      immutable: true,
      setHeaders: (res, filePath) => {
        res.setHeader("X-Content-Type-Options", "nosniff");
        if (filePath.toLowerCase().endsWith(".pdf")) {
          res.setHeader("Content-Disposition", "attachment");
        }
      },
    }),
  );

  app.use(seoRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
import { createServer } from "node:http";

import { createApp } from "./app";
import { initializeDatabase, disconnectDatabase } from "./config/db";
import { env, isProduction } from "./config/env";
import { seedDevAdmin } from "./lib/dev-seed";
import { seedDevContent } from "./lib/dev-seed-content";
import { startDigestJob } from "./lib/digest-job";
import { logger } from "./lib/logger";
import { closeRealtime, initRealtime } from "./lib/realtime";

async function start(): Promise<void> {
  if (
    isProduction &&
    !(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET)
  ) {
    logger.warn(
      "Cloudinary is not configured. Uploaded media will be written to local disk and lost when the service redeploys.",
    );
  }

  try {
    await initializeDatabase();
    await seedDevAdmin();
    await seedDevContent();
  } catch (error) {
    logger.error({ err: error }, "Database initialization failed");
    process.exit(1);
  }

  const app = createApp();
  const server = createServer(app);
  initRealtime(server);
  startDigestJob();

  server.listen(env.PORT, () => {
    logger.info(`API listening on http://localhost:${env.PORT}`);
  });

  let shuttingDown = false;

  const shutdown = (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info({ signal }, "Shutting down");

    void closeRealtime().finally(() => {
      server.close(() => {
        void disconnectDatabase()
          .catch((error) => logger.error({ err: error }, "Failed to disconnect from MongoDB"))
          .finally(() => process.exit(0));
      });
    });

    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

void start().catch((error) => {
  logger.error({ err: error }, "Failed to start API");
  process.exit(1);
});
import cron from "node-cron";

import { logger } from "./logger";
import { runSavedSearchDigests } from "../services/saved-search.service";

let started = false;

export function startDigestJob() {
  if (started) return;
  started = true;

  cron.schedule("0 * * * *", () => {
    void runSavedSearchDigests().catch((error) => {
      logger.error({ error }, "Saved search digest job failed");
    });
  });

  logger.info(
    "Saved search digest job scheduled hourly (daily/weekly cadences are enforced per search)",
  );
}
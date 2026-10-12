import cron from "node-cron";
import { decayAbuseScores } from "../services/abuseService.js";
import { logger } from "../utils/logger.js";

const IS_PROD = process.env.NODE_ENV === "production";

/**
 * Track active jobs so we can stop them on shutdown
 */
let scheduledTasks = [];

/**
 * Prevent overlapping executions
 */
let isAbuseDecayRunning = false;

function scheduleAbuseDecay() {
  const task = cron.schedule(
    "0 * * * *", // every hour
    async () => {
      if (isAbuseDecayRunning) {
        logger.warn("Skipped abuse decay (previous run still active)");
        return;
      }

      try {
        isAbuseDecayRunning = true;
        logger.info("Starting abuse decay job");

        await decayAbuseScores();

        logger.info("Abuse decay job completed");
      } catch (err) {
        logger.error({ err }, "Abuse decay failed");
      } finally {
        isAbuseDecayRunning = false;
      }
    },
    {
      scheduled: false, // do not auto-start
      timezone: "UTC"
    }
  );

  return task;
}

/**
 * Start all cron jobs
 */
export function startCronJobs() {
  if (!IS_PROD) {
    logger.info("Cron jobs starting (development mode)");
  } else {
    logger.info("Cron jobs starting (production mode)");
  }

  const abuseDecayTask = scheduleAbuseDecay();
  abuseDecayTask.start();

  scheduledTasks.push(abuseDecayTask);
}

/**
 * Stop all cron jobs (for graceful shutdown)
 */
export function stopCronJobs() {
  logger.info("Stopping cron jobs");

  for (const task of scheduledTasks) {
    task.stop();
  }

  scheduledTasks = [];
}
import { processChannelHealth } from "../services/processChannelHealth.js";
import { logger } from "../utils/logger.js";
import { getRedis } from "../config/redis.js";

const LOCK_KEY = "channelHealth:lock";
const LOCK_TTL = 9000;

export function startChannelHealthWorker({ io }) {
  let running = false;

  const run = async () => {
    if (running) return;
    running = true;

    try {
      const redis = getRedis();

      // If Redis not configured, just run without lock
      if (!redis) {
        const result = await processChannelHealth();

        if (io && result?.updated > 0 && Array.isArray(result.health)) {
          for (const health of result.health) {
            io.emit("channelHealth:update", health);
        }
      }

        running = false;
        return;
      }

      // 🔒 Distributed lock
      const acquired = await redis.set(
        LOCK_KEY,
        "1",
        "NX",
        "PX",
        LOCK_TTL
      );

      if (!acquired) {
        running = false;
        return;
      }

      const result = await processChannelHealth();

      if (io && result?.updated > 0 && Array.isArray(result.health)) {
        for (const health of result.health) {
          io.emit("channelHealth:update", health);
        }
      }

    } catch (err) {
      logger.error({ err }, "❌ Channel health worker failed");
    } finally {
      running = false;
    }
  };

  setTimeout(run, Math.random() * 2000);
  const timer = setInterval(run, 10 * 1000);

  logger.info("🧠 ChannelHealthWorker running every 10s");

  return () => clearInterval(timer);
}
import Redis from "ioredis";
import { logger } from "./logger.js";

let redis = null;

export function getRedis() {
  if (!process.env.REDIS_URL) {
    logger.warn("REDIS_URL not configured — Redis disabled");
    return null;
  }

  if (redis) return redis;

  redis = new Redis(process.env.REDIS_URL, {
    lazyConnect: true,

    maxRetriesPerRequest: 3,         // prevents infinite retries
    enableReadyCheck: true,

    connectTimeout: 5000,            // 5s timeout
    commandTimeout: 5000,

    retryStrategy(times) {
      if (times > 5) {
        logger.error("Redis retry limit exceeded");
        return null; // stops reconnecting
      }

      return Math.min(times * 200, 2000);
    },

    enableOfflineQueue: false,       // 🔥 critical for scale
  });

  redis.on("connect", () => {
    logger.info("Redis connected");
  });

  redis.on("ready", () => {
    logger.info("Redis ready");
  });

  redis.on("error", (err) => {
    logger.error({ err }, "Redis error");
  });

  redis.on("close", () => {
    logger.warn("Redis connection closed");
  });

  redis.on("reconnecting", () => {
    logger.warn("Redis reconnecting...");
  });

  redis.connect().catch((err) => {
    logger.error({ err }, "Initial Redis connect failed");
  });

  return redis;
}
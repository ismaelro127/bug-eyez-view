import Redis from "ioredis";
import { logger } from "../utils/logger.js";

let redisClient = null;

export function getRedis() {
  if (!process.env.REDIS_URL) {
    return null;
  }

  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      enableOfflineQueue: false,   // 🔥 prevent memory explosion
      connectTimeout: 5000,        // 🔥 prevent hanging connections

      retryStrategy(times) {
        if (times > 5) return null;
        return Math.min(times * 100, 2000);
      },
    });

    redisClient.on("error", (err) => {
      logger.error({ err }, "Redis connection error");
    });
  }

  return redisClient;
}
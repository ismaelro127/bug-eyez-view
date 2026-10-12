import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { getRedis } from "../config/redis.js";

/**
 * IP + User rate limiter (Redis-backed, production-ready)
 */
export default function ipUserLimiter({
  windowMs = 60 * 1000,
  max = 100,
  prefix = "rl:ip_user",
} = {}) {
  const redis = getRedis();

  return rateLimit({
    windowMs,
    standardHeaders: true,
    legacyHeaders: false,

    store: redis
      ? new RedisStore({
          // ✅ correct for ioredis
          sendCommand: (command, ...args) => redis.call(command, ...args),
          prefix,
        })
      : undefined, // in-memory fallback (dev only)

    keyGenerator: (req) => {
      const ip = ipKeyGenerator(req);
      const userId = req.user?._id?.toString() || "anon";
      return `${userId}:${ip}`;
    },

    max,

    handler: (_req, res) => {
      res.status(429).json({
        error: "RATE_LIMITED",
        message: "Too many requests",
      });
    },
  });
}

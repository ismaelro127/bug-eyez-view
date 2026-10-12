import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { getRedis } from "../config/redis.js";
import UserFeatures from "../models/UserFeatures.js";

const TRUST_LIMITS = {
  trusted: 30,
  normal: 12,
  restricted: 4,
  shadow: 0,
};

const redis = getRedis();

let store;

if (redis && redis.status === "ready") {
  store = new RedisStore({
    sendCommand: (command, ...args) => redis.call(command, ...args),
    prefix: "rl:ad_award:",
  });
}

export default rateLimit({
  windowMs: 60 * 1000,
  standardHeaders: true,
  legacyHeaders: false,
  store,

  keyGenerator: (req) => {
    const adType = req.body?.adType || "rewarded";
    const userId = req.user?._id?.toString() || "anon";
    const ip = ipKeyGenerator(req);
    return `${userId}:${ip}:${adType}`;
  },

  max: async (req) => {
    const userId = req.user?._id;
    if (!userId) return 3;

    const features = await UserFeatures.findOne({ userId }).lean();
    const tier = features?.trustTier || "normal";
    return TRUST_LIMITS[tier] ?? 12;
  },

  handler: (_req, res) => {
    res.status(429).json({
      error: "RATE_LIMITED",
      message: "Too many ad reward attempts",
    });
  },
});

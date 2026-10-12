import rateLimit from "express-rate-limit";
import { logger } from "../utils/logger.js";

const IS_PROD = process.env.NODE_ENV === "production";

function createLimiter(options) {
  return rateLimit({
    ...options,

    standardHeaders: true,
    legacyHeaders: false,

    handler: (req, res, next, options) => {
      logger.warn({
        ip: req.ip,
        path: req.originalUrl,
        userAgent: req.headers["user-agent"]
      }, "Rate limit exceeded");

      res.status(options.statusCode).json({
        error: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Please slow down."
      });
    },
  });
}

export const globalLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: IS_PROD ? 300 : 1000,
});

export const authLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  max: IS_PROD ? 20 : 100,
});
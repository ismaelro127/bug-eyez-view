import cors from "cors";
import { logger } from "../utils/logger.js";

/**
 * Parse allowed origins from env
 * Example:
 * CORS_ORIGINS=https://app.com,https://admin.app.com
 */
const RAW_ORIGINS = process.env.CORS_ORIGINS || "http://localhost:3000";

const ALLOWED_ORIGINS = RAW_ORIGINS
  .split(",")
  .map(o => o.trim())
  .filter(Boolean);

/**
 * Whether we are in production
 */
const IS_PROD = process.env.NODE_ENV === "production";

/**
 * Origin validation logic
 */
function validateOrigin(origin, callback) {
  // Allow server-to-server / curl only in non-production
  if (!origin) {
    if (!IS_PROD) {
      return callback(null, true);
    }

    logger.warn("Blocked non-browser request in production (no origin)");
    return callback(new Error("CORS_ORIGIN_REQUIRED"));
  }

  if (ALLOWED_ORIGINS.includes(origin)) {
    return callback(null, true);
  }

  logger.warn({ origin }, "Blocked by CORS policy");
  return callback(new Error("CORS_NOT_ALLOWED"));
}

/**
 * Export configured middleware
 */
const corsConfig = cors({
  origin: validateOrigin,
  credentials: true,
  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS"
  ],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With"
  ],
  exposedHeaders: [
    "Content-Length"
  ],
  optionsSuccessStatus: 204,
  maxAge: 600 // Cache preflight 10 minutes
});

export default corsConfig;
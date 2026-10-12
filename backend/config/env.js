import { logger } from "../utils/logger.js";

const REQUIRED_ENV = [
  "JWT_SECRET",
];

export function validateEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    logger.fatal({ missing }, "Missing required environment variables");
    throw new Error("ENV_VALIDATION_FAILED");
  }

  logger.info("Environment validated");
}

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || "development",
  JWT_SECRET: process.env.JWT_SECRET,
  PORT: Number(process.env.PORT || 5000),
};
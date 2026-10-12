import express from "express";
import mongoose from "mongoose";
import os from "os";
import { isPipelineEnabled, togglePipeline } from "../config/featureFlags.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminOnly from "../middleware/adminOnly.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

/**
 * Liveness probe (fast, no DB dependency)
 */
router.get("/health/live", (req, res) => {
  res.json({ status: "alive" });
});

/**
 * Readiness probe (checks DB)
 */
router.get("/health/ready", async (req, res) => {
  const mongoReady = mongoose.connection.readyState === 1;

  if (!mongoReady) {
    return res.status(503).json({
      status: "not_ready",
      mongo: false,
    });
  }

  res.json({
    status: "ready",
    mongo: true,
  });
});

/**
 * Detailed system health
 */
router.get("/health", async (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    mongo: mongoose.connection.readyState === 1,
    cpuLoad: os.loadavg(),
    pipelineEnabled: isPipelineEnabled(),
  });
});

/**
 * Secure pipeline toggle
 * ADMIN ONLY
 */
router.post(
  "/toggle-pipeline",
  authMiddleware,
  adminOnly,
  (req, res) => {
    const newState = togglePipeline();

    logger.warn(
      { userId: req.user._id, newState },
      "Pipeline toggled"
    );

    res.json({
      status: newState
        ? "Auto-run ENABLED"
        : "Auto-run DISABLED",
    });
  }
);

export default router;a
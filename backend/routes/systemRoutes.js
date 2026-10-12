import express from "express";
import mongoose from "mongoose";
import os from "os";
import authMiddleware from "../middleware/authMiddleware.js";
import adminOnly from "../middleware/adminOnly.js";
import { isPipelineEnabled, togglePipeline } from "../config/featureFlags.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

/**
 * Liveness probe
 * Used by load balancers
 */
router.get("/health/live", (req, res) => {
  res.json({ status: "alive" });
});

/**
 * Readiness probe
 * Confirms DB connection
 */
router.get("/health/ready", (req, res) => {
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
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpuLoad: os.loadavg(),
    mongo: mongoose.connection.readyState === 1,
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

export default router;
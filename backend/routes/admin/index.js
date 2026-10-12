import express from "express";
import adminOnly from "../../middleware/adminOnly.js";

// Admin sub-routes
import metrics from "./metrics.js";
import users from "./users.js";
import ledger from "./ledger.js";
import controls from "./controls.js";
import channelStats from "./channelStats.js";
import stability from "./stability.js"; // ✅ ADD THIS
import persistStability from "./persistStability.js"; // ✅ ADD THIS
import insights from "./insights.js"; // ✅ ADD THIS    
import channelHealth from "./channelHealth.js";


const router = express.Router();

/**
 * 🔐 Admin Gate
 * Assumes authMiddleware already ran upstream
 */
router.use(adminOnly);
router.use("/channel-stats", channelStats);
// admin/index.ts
router.use("/stability", stability);
router.use("/persist-stability", persistStability);
router.use("/insights", insights);
router.use("/channel-health", channelHealth);

/**
 * 📊 System Metrics
 * GET /api/admin/metrics
 */
router.use("/metrics", metrics);

/**
 * 👤 User Management
 * GET /api/admin/users
 * POST /api/admin/users/:id/role
 * etc.
 */
router.use("/users", users);

/**
 * 💳 Credit Ledger (read-only)
 * GET /api/admin/ledger
 */
router.use("/ledger", ledger);

/**
 * 🛠️ Admin Controls
 * Kill switches, overrides, feature toggles
 * POST /api/admin/controls/*
 */
router.use("/controls", controls);

export default router;

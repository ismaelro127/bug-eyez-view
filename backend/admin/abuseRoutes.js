import express from "express";
import mongoose from "mongoose";
import authMiddleware from "../../middleware/authMiddleware.js";
import adminOnly from "../../middleware/adminOnly.js";
import rateLimit from "express-rate-limit";
import { getAbuseStats } from "../../services/abuseService.js";
import { logger } from "../../utils/logger.js";

const router = express.Router();

/* ==========================================
   Admin rate limiter (protect enumeration)
========================================== */
const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
});

/* ==========================================
   GET /api/admin/user/:userId/abuse
========================================== */
router.get(
  "/user/:userId/abuse",
  authMiddleware,
  adminOnly,
  adminLimiter,
  async (req, res) => {
    try {
      const { userId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: "INVALID_USER_ID" });
      }

      const stats = await getAbuseStats(userId);

      return res.json(stats || {});

    } catch (err) {
      logger.error(
        { err, adminId: req.user._id, target: req.params.userId },
        "ADMIN_ABUSE_STATS_FAILED"
      );

      return res.status(500).json({ error: "ABUSE_STATS_FAILED" });
    }
  }
);

export default router;
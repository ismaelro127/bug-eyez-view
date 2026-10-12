import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import rateLimit from "express-rate-limit";
import {
  getCaptionCapabilities,
  validateCaptionMode,
} from "../services/captionService.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

/**
 * Rate limit caption start attempts
 */
const captionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
});

/**
 * GET /api/captions/capabilities
 */
router.get("/capabilities", authMiddleware, async (req, res) => {
  try {
    const data = await getCaptionCapabilities(req.user._id);
    res.json(data);
  } catch (err) {
    if (err.message === "USER_NOT_FOUND") {
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }

    logger.error({ err }, "CAPTION_ROUTE_FAILED");
    res.status(500).json({ error: "CAPTION_CAPABILITIES_FAILED" });
  }
});

/**
 * POST /api/captions/start
 */
router.post(
  "/start",
  authMiddleware,
  captionLimiter,
  async (req, res) => {
    try {
      const { mode } = req.body || {};

      validateCaptionMode(mode);

      // Future: deduct credits here
      // Future: start caption session record

      return res.status(403).json({ error: "CAPTION_MODE_DISABLED" });

    } catch (err) {
      if (err.message === "INVALID_MODE") {
        return res.status(400).json({ error: "INVALID_MODE" });
      }

      if (err.message === "MODE_DISABLED") {
        return res.status(403).json({ error: "CAPTION_MODE_DISABLED" });
      }

      logger.error({ err }, "CAPTION_START_FAILED");
      return res.status(500).json({ error: "CAPTION_START_FAILED" });
    }
  }
);

export default router;
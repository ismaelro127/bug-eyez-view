import express from "express";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import User from "../models/User.js";
import InternalAuditLog from "../models/InternalAuditLog.js";
import internalSignature from "../middleware/internalSignature.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
});

/**
 * GET balance
 */
router.get(
  "/bugzcoin/balance",
  internalSignature,
  strictLimiter,
  async (req, res) => {
    try {
      const { userId } = req.query;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: "INVALID_USER_ID" });
      }

      const user = await User.findById(userId, { credits: 1 }).lean();
      if (!user) {
        return res.status(404).json({ error: "USER_NOT_FOUND" });
      }

      await InternalAuditLog.create({
        action: "INTERNAL_BALANCE_CHECK",
        userId,
        ip: req.ip,
      });

      return res.json({ balance: user.credits });

    } catch (err) {
      logger.error({ err }, "INTERNAL_BALANCE_FAILED");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  }
);

/**
 * POST ad complete
 */
router.post(
  "/ads/complete",
  internalSignature,
  strictLimiter,
  async (req, res) => {
    try {
      const { userId, adType, proof, idempotencyKey } = req.body;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: "INVALID_USER_ID" });
      }

      if (!adType || !proof || !idempotencyKey) {
        return res.status(400).json({ error: "INVALID_INPUT" });
      }

      // Idempotency protection
      const existingLog = await InternalAuditLog.findOne({
        "metadata.idempotencyKey": idempotencyKey,
      });

      if (existingLog) {
        return res.json({ status: "ALREADY_PROCESSED" });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: "USER_NOT_FOUND" });
      }

      // TODO: verify proof with ad provider here

      // Credit logic (example)
      const rewardMap = {
        rewarded_video: 5,
        short_ad: 2,
      };

      const reward = rewardMap[adType];
      if (!reward) {
        return res.status(400).json({ error: "INVALID_AD_TYPE" });
      }

      user.credits += reward;
      await user.save();

      await InternalAuditLog.create({
        action: "AD_REWARD_GRANTED",
        userId,
        ip: req.ip,
        metadata: {
          adType,
          reward,
          idempotencyKey,
        },
      });

      return res.json({
        ok: true,
        totalCredits: user.credits,
      });

    } catch (err) {
      logger.error({ err }, "INTERNAL_AD_COMPLETE_FAILED");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  }
);

export default router;
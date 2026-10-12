import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import adminOnly from "../middleware/adminOnly.js";

import { reverseCredits } from "../services/reverseCredits.js";
import { getAbuseStats } from "../services/abuseStats.js";

import CreditLedger from "../models/CreditLedger.js";
import UserFeatures from "../models/UserFeatures.js";

const router = express.Router();

// 🔐 ALL admin routes
router.use(authMiddleware);
router.use(adminOnly);

/**
 * ==========================
 * GET /api/admin/user/:userId/abuse
 * ==========================
 */
router.get("/user/:userId/abuse", async (req, res) => {
  const stats = await getAbuseStats(req.params.userId);
  if (!stats) {
    return res.status(404).json({ error: "USER_NOT_FOUND" });
  }
  res.json(stats);
});

/**
 * ==========================
 * GET /api/admin/ledger
 * ==========================
 */
router.get("/ledger", async (req, res) => {
  const { userId, limit = 50 } = req.query;

  const query = userId ? { userId } : {};
  const ledger = await CreditLedger.find(query)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit), 200))
    .lean();

  res.json({ ledger });
});

/**
 * ==========================
 * POST /api/admin/credits/reverse
 * ==========================
 */
router.post("/credits/reverse", async (req, res) => {
  const { userId, originalTxnId, amount, note } = req.body;

  if (!userId || !originalTxnId || !amount) {
    return res.status(400).json({ error: "MISSING_FIELDS" });
  }

  const result = await reverseCredits({
    userId,
    originalTxnId,
    amount,
    adminId: req.user._id,
    note,
  });

  res.json(result);
});

/**
 * ==========================
 * POST /api/admin/user/:userId/restrict
 * ==========================
 */
router.post("/user/:userId/restrict", async (req, res) => {
  const { tier, minutes } = req.body;

  const update = {};
  if (tier) update.trustTier = tier;

  if (minutes > 0) {
    update.restrictedUntil = new Date(
      Date.now() + minutes * 60 * 1000
    );
  } else {
    update.restrictedUntil = null;
  }

  await UserFeatures.updateOne(
    { userId: req.params.userId },
    { $set: update }
  );

  res.json({ ok: true });
});

export default router;

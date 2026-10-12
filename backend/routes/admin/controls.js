import express from "express";
import UserFeatures from "../../models/UserFeatures.js";
import {
  disableAdRewards,
  enableAdRewards,
  isAdRewardsDisabled,
} from "../../services/adKillSwitch.js";
import { mintCredits } from "../../services/mintCredits.js";

const router = express.Router();

/**
 * ================================
 * GET /api/admin/controls
 * Read current admin control state
 * ================================
 */
router.get("/", async (_req, res) => {
  const adsDisabled = await isAdRewardsDisabled();

  res.json({
    ads: {
      enabled: !adsDisabled,
    },
  });
});

/**
 * ================================
 * 🔴 Ad Kill Switch
 * ================================
 */
router.post("/ads/disable", async (_req, res) => {
  await disableAdRewards();
  res.json({ ok: true, adsEnabled: false });
});

router.post("/ads/enable", async (_req, res) => {
  await enableAdRewards();
  res.json({ ok: true, adsEnabled: true });
});

/**
 * ================================
 * 🔧 Trust Tier Override
 * ================================
 */
router.post("/trust/:userId", async (req, res) => {
  const { userId } = req.params;
  const { tier } = req.body;

  if (!tier) {
    return res.status(400).json({ error: "MISSING_TIER" });
  }

  await UserFeatures.updateOne(
    { userId },
    { trustTier: tier },
    { upsert: true }
  );

  res.json({ ok: true, userId, tier });
});

/**
 * ================================
 * 💰 Manual Credit Grant (logged)
 * ================================
 */
router.post("/grant", async (req, res) => {
  const { userId, amount, reason = "admin_grant" } = req.body;

  if (!userId || typeof amount !== "number") {
    return res.status(400).json({ error: "INVALID_PAYLOAD" });
  }

  const result = await mintCredits({
    userId,
    amount,
    reason,
    source: "admin",
    refType: "admin_op",
    refId: `admin_${Date.now()}`,
  });

  res.json({
    ok: true,
    userId,
    credits: result.credits,
  });
});

export default router;

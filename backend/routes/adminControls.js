import express from "express";
import UserFeatures from "../../models/UserFeatures.js";
import UserBalance from "../../models/UserBalance.js";
import UnlockedChannel from "../../models/UnlockedChannel.js";
import AdminAction from "../../models/AdminAction.js";
import { mintCredits } from "../../services/mintCredits.js";
import { spendCredits } from "../../services/spendCredits.js";

const router = express.Router();

/**
 * Utility: log admin action
 */
async function logAction(adminId, action, targetUserId, meta = {}) {
  await AdminAction.create({
    adminId,
    action,
    targetUserId,
    meta,
  });
}

/**
 * ================================
 * POST /api/admin/controls/ad-rewards
 * Enable / disable ads globally
 * ================================
 */
router.post("/ad-rewards", async (req, res) => {
  const { disabled } = req.body;

  await UserFeatures.updateMany(
    {},
    { $set: { adRewardsDisabled: !!disabled } }
  );

  await logAction(req.user._id, "TOGGLE_AD_REWARDS", null, { disabled });

  res.json({ ok: true, disabled });
});

/**
 * ================================
 * POST /api/admin/controls/freeze-user
 * ================================
 */
router.post("/freeze-user", async (req, res) => {
  const { userId, frozen } = req.body;

  await UserFeatures.findOneAndUpdate(
    { userId },
    { frozen: !!frozen },
    { upsert: true }
  );

  await logAction(req.user._id, "FREEZE_USER", userId, { frozen });

  res.json({ ok: true, userId, frozen });
});

/**
 * ================================
 * POST /api/admin/controls/shadow-user
 * ================================
 */
router.post("/shadow-user", async (req, res) => {
  const { userId, shadowed } = req.body;

  await UserFeatures.findOneAndUpdate(
    { userId },
    { trustTier: shadowed ? "shadow" : "normal" },
    { upsert: true }
  );

  await logAction(req.user._id, "SHADOW_USER", userId, { shadowed });

  res.json({ ok: true, userId, shadowed });
});

/**
 * ================================
 * POST /api/admin/controls/adjust-credits
 * ================================
 */
router.post("/adjust-credits", async (req, res) => {
  const { userId, amount, reason = "admin_adjustment" } = req.body;

  if (!amount || amount === 0) {
    return res.status(400).json({ error: "INVALID_AMOUNT" });
  }

  let result;
  if (amount > 0) {
    result = await mintCredits({
      userId,
      amount,
      reason,
      source: "admin",
      refType: "admin_adjustment",
      refId: `admin_${Date.now()}`,
    });
  } else {
    result = await spendCredits({
      userId,
      cost: Math.abs(amount),
      action: reason,
      source: "admin",
      refId: `admin_${Date.now()}`,
    });
  }

  await logAction(req.user._id, "ADJUST_CREDITS", userId, { amount });

  res.json({ ok: true, credits: result.credits });
});

/**
 * ================================
 * POST /api/admin/controls/unlock-channel
 * ================================
 */
router.post("/unlock-channel", async (req, res) => {
  const { userId, channelId } = req.body;

  await UnlockedChannel.findOneAndUpdate(
    { userId, channelId },
    {},
    { upsert: true }
  );

  await logAction(req.user._id, "FORCE_UNLOCK_CHANNEL", userId, { channelId });

  res.json({ ok: true, channelId });
});

export default router;

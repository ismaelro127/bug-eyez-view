import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import adminOnly from "../middleware/adminOnly.js";

import UserFeatures from "../models/UserFeatures.js";
import AdminAuditLog from "../models/AdminAuditLog.js";

const router = express.Router();

// 🔒 Admin protection
router.use(authMiddleware);
router.use(adminOnly);

/**
 * ================================
 * PART B — Trust Tier Control
 * ================================
 */
router.post("/users/:id/trust-tier", async (req, res) => {
  const adminId = req.user._id;
  const userId = req.params.id;
  const { tier } = req.body;

  if (!["trusted", "normal", "restricted", "shadow"].includes(tier)) {
    return res.status(400).json({ error: "INVALID_TRUST_TIER" });
  }

  const features =
    (await UserFeatures.findOne({ userId })) ??
    (await UserFeatures.create({ userId }));

  features.trustTier = tier;

  // Shadow tier = silent restriction
  if (tier === "shadow") {
    features.restrictedUntil = null;
  }

  await features.save();

  await AdminAuditLog.create({
    adminId,
    userId,
    action: "SET_TRUST_TIER",
    meta: { tier },
  });

  res.json({ ok: true, trustTier: tier });
});

export default router;

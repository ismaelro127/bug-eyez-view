import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import adminOnly from "../middleware/adminOnly.js";

import User from "../models/User.js";
import UserFeatures from "../models/UserFeatures.js";
import CreditLedger from "../models/CreditLedger.js";

const router = express.Router();

router.use(authMiddleware);
router.use(adminOnly);

/**
 * GET /api/admin/abuse/users
 * List users with abuse info (filter/sort)
 */
router.get("/users", async (req, res) => {
  try {
    const {
      q = "",
      trustTier,
      minScore,
      restrictedOnly,
      limit = "50",
    } = req.query;

    const lim = Math.max(1, Math.min(200, parseInt(limit, 10) || 50));

    // find users by email search (optional)
    const userFilter = q
      ? { email: { $regex: String(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } }
      : {};

    const users = await User.find(userFilter, { _id: 1, email: 1 })
      .limit(lim)
      .lean();

    const ids = users.map((u) => u._id);

    const featFilter = { userId: { $in: ids } };

    if (trustTier) featFilter.trustTier = trustTier;
    if (minScore) featFilter.abuseScore = { $gte: Number(minScore) || 0 };
    if (restrictedOnly === "true") featFilter.restrictedUntil = { $gt: new Date() };

    const features = await UserFeatures.find(featFilter).lean();

    const map = new Map(features.map((f) => [String(f.userId), f]));

    const out = users
      .map((u) => {
        const f = map.get(String(u._id));
        return {
          userId: u._id,
          email: u.email,
          abuseScore: f?.abuseScore ?? 0,
          trustTier: f?.trustTier ?? "normal",
          restrictedUntil: f?.restrictedUntil ?? null,
          lastAbuseAt: f?.lastAbuseAt ?? null,
          recentViolations: f?.recentViolations ?? 0,
        };
      })
      // sort worst-first
      .sort((a, b) => (b.abuseScore || 0) - (a.abuseScore || 0));

    res.json({ ok: true, users: out });
  } catch (err) {
    res.status(500).json({ error: err.message || "ADMIN_LIST_FAILED" });
  }
});

/**
 * GET /api/admin/abuse/user/:userId
 * Full abuse details + last ad rewards
 */
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId, { _id: 1, email: 1 }).lean();
    if (!user) return res.status(404).json({ error: "NOT_FOUND" });

    const features = await UserFeatures.findOne({ userId }).lean();

    const adLedger = await CreditLedger.find(
      { userId, refType: "ad_reward" },
      { _id: 0, createdAt: 1, delta: 1, refId: 1, ip: 1, "meta.effectiveDeviceHash": 1, txHash: 1 }
    )
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json({
      ok: true,
      user: { userId: user._id, email: user.email },
      features: features || {
        abuseScore: 0,
        trustTier: "normal",
        restrictedUntil: null,
        lastAbuseAt: null,
        abuseLog: [],
      },
      recentAdRewards: adLedger,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "ADMIN_DETAIL_FAILED" });
  }
});

export default router;

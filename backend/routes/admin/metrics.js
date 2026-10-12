import express from "express";
import User from "../../models/User.js";
import UserFeatures from "../../models/UserFeatures.js";
import CreditLedger from "../../models/CreditLedger.js";
import UserActivity from "../../models/UserActivity.js";

const router = express.Router();

/**
 * GET /api/admin/metrics
 * Admin-only system metrics
 * Assumes authMiddleware + adminOnly ran upstream
 */
router.get("/", async (req, res) => {
  try {
    const now = new Date();
    const sinceToday = new Date(now);
    sinceToday.setHours(0, 0, 0, 0);

    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    /* ================================
     * USERS
     * ================================ */
    const [
      totalUsers,
      newUsersToday,
      activeUsers24h,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: sinceToday } }),
      UserActivity.distinct("userId", {
        createdAt: { $gte: since24h },
      }).then((ids) => ids.length),
    ]);

    /* ================================
     * CREDITS
     * ================================ */
    const creditAggToday = await CreditLedger.aggregate([
      { $match: { createdAt: { $gte: sinceToday } } },
      {
        $group: {
          _id: null,
          earned: {
            $sum: {
              $cond: [{ $gt: ["$delta", 0] }, "$delta", 0],
            },
          },
          spent: {
            $sum: {
              $cond: [{ $lt: ["$delta", 0] }, { $abs: "$delta" }, 0],
            },
          },
        },
      },
    ]);

    const totalsAgg = await CreditLedger.aggregate([
      {
        $group: {
          _id: null,
          sum: { $sum: "$delta" },
        },
      },
    ]);

    const creditsEarnedToday = creditAggToday[0]?.earned ?? 0;
    const creditsSpentToday = creditAggToday[0]?.spent ?? 0;
    const totalCredits = totalsAgg[0]?.sum ?? 0;

    /* ================================
     * ADS
     * ================================ */
    const [
      rewardedAdsToday,
      shadowedAdsToday,
    ] = await Promise.all([
      CreditLedger.countDocuments({
        refType: "ad_reward",
        delta: { $gt: 0 },
        createdAt: { $gte: sinceToday },
      }),
      CreditLedger.countDocuments({
        refType: "ad_reward",
        delta: 0,
        createdAt: { $gte: sinceToday },
      }),
    ]);

    /* ================================
     * TRUST / ABUSE
     * ================================ */
    const trustTiers = await UserFeatures.aggregate([
      {
        $group: {
          _id: "$trustTier",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const abuseTopToday = await UserActivity.aggregate([
      {
        $match: {
          type: "abuse",
          createdAt: { $gte: sinceToday },
        },
      },
      {
        $group: {
          _id: "$reason",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    /* ================================
     * RESPONSE
     * ================================ */
    res.json({
      users: {
        total: totalUsers,
        newToday: newUsersToday,
        active24h: activeUsers24h,
      },
      credits: {
        totalInCirculation: totalCredits,
        earnedToday: creditsEarnedToday,
        spentToday: creditsSpentToday,
        netToday: creditsEarnedToday - creditsSpentToday,
      },
      ads: {
        rewardedToday: rewardedAdsToday,
        shadowedToday: shadowedAdsToday,
      },
      trust: {
        tiers: trustTiers,
        abuseTopReasonsToday: abuseTopToday,
      },
      meta: {
        generatedAt: now,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    });
  } catch (err) {
    logger.error("❌ ADMIN METRICS ERROR:", err);
    res.status(500).json({ error: "FAILED_TO_LOAD_METRICS" });
  }
});

export default router;

import express from "express";
import ChannelHealth from "../../models/ChannelHealth.js";
import ChannelMinuteStats from "../../models/ChannelMinuteStats.js";
import { getRedis } from "../../utils/redis.js";
const router = express.Router();
const redis = getRedis();
const cacheKey = "admin:channelHealth:overview";

/**
 * GET /api/admin/channel-health/overview
 */
router.get("/overview", async (req, res) => {
  try {
    const [totals] = await ChannelHealth.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          high: { $sum: { $cond: [{ $eq: ["$tier", "high"] }, 1, 0] } },
          medium: { $sum: { $cond: [{ $eq: ["$tier", "medium"] }, 1, 0] } },
          unstable: { $sum: { $cond: [{ $eq: ["$tier", "unstable"] }, 1, 0] } },
          disabled: { $sum: { $cond: [{ $eq: ["$is_disabled", true] }, 1, 0] } },
          suppressed: { $sum: { $cond: [{ $eq: ["$suppressed", true] }, 1, 0] } },
          avgScore: { $avg: "$health_score" },
        },
      },
      { $project: { _id: 0 } },
    ]);

    res.json(totals || { total: 0, high: 0, medium: 0, unstable: 0, disabled: 0, suppressed: 0, avgScore: 0 });
  } catch (err) {
    logger.error("admin overview error:", err);
    res.status(500).json({ error: "OVERVIEW_FAILED" });
  }
});

/**
 * GET /api/admin/channel-health/worst?limit=50
 */
router.get("/worst", async (req, res) => {
  try {
    const rawLimit = parseInt(req.query.limit, 10);
const limit = Number.isFinite(rawLimit)
  ? Math.min(rawLimit, 200)
  : 50;

    const rows = await ChannelHealth.find(
      {},
      {
        channel_id: 1,
        health_score: 1,
        tier: 1,
        suppressed: 1,
        is_disabled: 1,
        avg_watch_time: 1,
        last_updated: 1,
        suppressed_reason: 1,
        disabled_reason: 1,
      }
    )
      .sort({ health_score: 1 })
      .limit(limit)
      .lean();

    res.json(rows);
  } catch (err) {
    logger.error("admin worst error:", err);
    res.status(500).json({ error: "WORST_FAILED" });
  }
});

/**
 * GET /api/admin/channel-health/recent-traffic?minutes=60
 * Aggregates minute buckets across all channels for quick graphing.
 */
router.get("/recent-traffic", async (req, res) => {
  try {
    const minutes = Math.min(Number(req.query.minutes || 60), 24 * 60);
    const nowBucket = Math.floor(Date.now() / 60000);
    const startBucket = nowBucket - minutes + 1;

    const rows = await ChannelMinuteStats.aggregate([
      { $match: { minute_bucket: { $gte: startBucket, $lte: nowBucket } } },
      {
        $group: {
          _id: "$minute_bucket",
          plays: { $sum: "$plays" },
          fails: { $sum: "$fails" },
          stops: { $sum: "$stop_count" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(
      rows.map((r) => ({
        minute_bucket: r._id,
        plays: r.plays || 0,
        fails: r.fails || 0,
        stops: r.stops || 0,
      }))
    );
  } catch (err) {
    logger.error("admin recent traffic error:", err);
    res.status(500).json({ error: "RECENT_TRAFFIC_FAILED" });
  }
});

export default router;
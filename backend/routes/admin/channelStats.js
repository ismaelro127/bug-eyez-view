import Event from "../../models/Event.js";
import { logger } from "../../utils/logger.js";
import { getRedis } from "../../utils/redis.js";

const CACHE_KEY = "channel_activity_stats";
const CACHE_TTL_SECONDS = 60; // adjust based on freshness needs

export async function getChannelActivityStats() {
  const redis = getRedis();

  try {
    // 1️⃣ Try cache first
    if (redis) {
      const cached = await redis.get(CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    // 2️⃣ Run Mongo aggregation
    const pipeline = [
      {
        $match: {
          duration_seconds: { $exists: true, $gt: 0 },
        },
      },
      {
        $addFields: {
          durationMin: { $divide: ["$duration_seconds", 60] },
          startHour: { $hour: "$createdAt" },
          dayOfWeek: { $dayOfWeek: "$createdAt" },
        },
      },
      {
        $group: {
          _id: "$channel_id",
          observations: { $sum: 1 },
          totalDuration: { $sum: "$durationMin" },
          avgConfidence: { $avg: "$meta.confidence" },
          hours: { $push: "$startHour" },
          days: { $push: "$dayOfWeek" },
        },
      },
    ];

    const data = await Event.aggregate(pipeline).allowDiskUse(true);

    const result = {};

    for (const row of data) {
      const hourFreq = {};
      const dayFreq = {};

      for (const h of row.hours) {
        hourFreq[h] = (hourFreq[h] || 0) + 1;
      }

      for (const d of row.days) {
        dayFreq[d] = (dayFreq[d] || 0) + 1;
      }

      const mostCommonHour =
        Object.entries(hourFreq).sort((a, b) => b[1] - a[1])[0]?.[0];

      const mostCommonDay =
        Object.entries(dayFreq).sort((a, b) => b[1] - a[1])[0]?.[0];

      result[row._id] = {
        channelId: row._id,
        observations: row.observations,
        avgDurationMin: Math.round(
          row.totalDuration / row.observations
        ),
        mostCommonStartHour: Number(mostCommonHour),
        mostCommonDay: Number(mostCommonDay),
        avgConfidence:
          Math.round((row.avgConfidence || 0.5) * 100) / 100,
      };
    }

    // 3️⃣ Store in Redis
    if (redis) {
      await redis.set(
        CACHE_KEY,
        JSON.stringify(result),
        "EX",
        CACHE_TTL_SECONDS
      );
    }

    return result;
  } catch (err) {
    logger.error({ err }, "Failed computing channel stats");
    return {};
  }
}

import express from "express";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const data = await getChannelActivityStats();
    res.json(data);
  } catch (err) {
    logger.error({ err }, "Channel stats route failed");
    res.status(500).json({ error: "CHANNEL_STATS_FAILED" });
  }
});

export default router;
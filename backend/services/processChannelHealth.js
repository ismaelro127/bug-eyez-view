import os from "os";
import crypto from "crypto";
import ChannelHealth from "../models/ChannelHealth.js";
import Event from "../models/Event.js";
import HealthCursor from "../models/HealthCursor.js";
import ChannelMinuteStats from "../models/ChannelMinuteStats.js";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

const WORKER_ID =
  process.env.INSTANCE_ID ||
  `${os.hostname()}-${process.pid}-${crypto.randomBytes(3).toString("hex")}`;

function minuteBucket(ts = Date.now()) {
  return Math.floor(ts / 60000);
}

export async function processChannelHealth({
  cursorKey = "channel_health",
  lockMinutes = 2,

  recentMinutes = 5,
  minPlaysForStable = 5,

  suppressThreshold = 0.4,
  suppressMinRecentPlays = 3,

  disableThreshold = 0.2,
  disableMinTotalPlays = 10,

  cooldownMinutes = 10,
  maxEventsPerRun = 25000,
} = {}) {
  const now = new Date();
  const lockExpiresAt = new Date(now.getTime() + lockMinutes * 60 * 1000);

  // Acquire cursor
  let cursor = await HealthCursor.findOne({ key: cursorKey });

  if (!cursor) {
    try {
      cursor = await HealthCursor.create({
        key: cursorKey,
        last_processed_at: null,
        locked_by: WORKER_ID,
        lock_expires_at: lockExpiresAt,
      });
    } catch (err) {
      if (err.code === 11000) {
        cursor = await HealthCursor.findOne({ key: cursorKey });
      } else {
        throw err;
      }
    }
  }

  // Acquire lock
  const lock = await HealthCursor.findOneAndUpdate(
  {
    key: cursorKey,
    $or: [
      { lock_expires_at: { $lte: now } },
      { lock_expires_at: null },
      { locked_by: WORKER_ID }
    ]
  },
  {
    $set: {
      locked_by: WORKER_ID,
      lock_expires_at: lockExpiresAt
    }
  },
  { new: true }
);

  if (!lock) {
    return { updated: 0, processedEvents: 0, skipped: true };
  }

  cursor = lock;

  // Determine last processed time
  const lastProcessedAt = cursor.last_processed_at || new Date(0);

  // Fetch events
  const events = await Event.find({
    createdAt: { $gt: lastProcessedAt }
  })
  .sort({ createdAt: 1 })
  .limit(maxEventsPerRun)
  .lean();

  if (events.length >= maxEventsPerRun * 0.9) {
  console.warn("ChannelHealthWorker backlog detected");
}
  const delta = new Map();
  const touched = new Set();
  let newestEventAt = lastProcessedAt;

  for (const e of events) {
    const ch = e.channel_id;
    if (!ch) continue;

    touched.add(ch);

    if (e.createdAt && e.createdAt > newestEventAt) {
      newestEventAt = e.createdAt;
    }

    if (!delta.has(ch)) {
      delta.set(ch, { plays: 0, fails: 0, stopSum: 0, stopCount: 0 });
    }

    const d = delta.get(ch);

    if (e.type === "channel-play-started") d.plays++;
    if (e.type === "channel-play-failed") d.fails++;

    if (
      e.type === "channel-play-stopped" &&
      typeof e.duration_seconds === "number" &&
      e.duration_seconds >= 0
    ) {
      d.stopSum += e.duration_seconds;
      d.stopCount++;
    }
  }

const channelIds = [...touched];
const nextCursor = newestEventAt;

  if (!channelIds.length) {
    await HealthCursor.updateOne(
      { key: cursorKey, locked_by: WORKER_ID },
      {
        $set: {
          last_processed_at: nextCursor,
          lock_expires_at: new Date(now.getTime() + 5000),
        },
      }
    );

    return { updated: 0, processedEvents: events.length };
  }

  // Recent window from minute buckets
  const nowBucket = minuteBucket();
  const buckets = [];
  for (let i = 0; i < recentMinutes; i++) buckets.push(nowBucket - i);

  const recentRows = await ChannelMinuteStats.aggregate([
    { $match: { channel_id: { $in: channelIds }, minute_bucket: { $in: buckets } } },
    {
      $group: {
        _id: "$channel_id",
        recent_plays: { $sum: "$plays" },
        recent_fails: { $sum: "$fails" },
      },
    },
  ]);

  const recentMap = new Map(recentRows.map((r) => [r._id, r]));

  const existing = await ChannelHealth
  .find({ channel_id: { $in: channelIds } })
  .select("channel_id total_plays total_fails meta suppressed")
  .lean();
  
  const existingMap = new Map(existing.map((x) => [x.channel_id, x]));

  const ops = [];

  for (const channel_id of channelIds) {
    const d = delta.get(channel_id) || { plays: 0, fails: 0, stopSum: 0, stopCount: 0 };
    const prev = existingMap.get(channel_id) || { total_plays: 0, total_fails: 0, meta: {} };

    let totalPlays = (prev.total_plays || 0) + d.plays;
let totalFails = (prev.total_fails || 0) + d.fails;

// ensure plays reflect failures
if (totalFails > totalPlays) {
  totalPlays = totalFails;
}
    const r = recentMap.get(channel_id) || { recent_plays: 0, recent_fails: 0 };
    const recentPlays = r.recent_plays || 0;
    const recentFails = r.recent_fails || 0;

    const successRate = totalPlays > 0 ? (totalPlays - totalFails) / totalPlays : 1;
    const recentSuccessRate = recentPlays > 0 ? (recentPlays - recentFails) / recentPlays : 1;

    const totalWeight = totalPlays < minPlaysForStable ? 0.3 : 0.6;
    const recentWeight = 1 - totalWeight;

    const rawScore = (successRate * totalWeight + recentSuccessRate * recentWeight) * 100;
    const health_score = Math.round(clamp(rawScore, 0, 100));

    let tier = "high";
    if (health_score < 60) tier = "unstable";
    else if (health_score < 85) tier = "medium";

    const prevMeta = prev.meta || {};
    const prevStopSum = Number(prevMeta.stop_sum || 0);
    const prevStopCount = Number(prevMeta.stop_count || 0);

    const stopSum = prevStopSum + d.stopSum;
    const stopCount = prevStopCount + d.stopCount;

    const avg_watch_time = stopCount > 0 ? Number((stopSum / stopCount).toFixed(2)) : 0;

    let suppressed = prev.suppressed || false;
let suppressed_reason = prev.suppressed_reason || "";
let suppressed_until = prev.suppressed_until || null;

if (recentPlays >= suppressMinRecentPlays && recentSuccessRate < suppressThreshold) {
  suppressed = true;
  suppressed_reason = "recent_fail_spike";
  suppressed_until = new Date(now.getTime() + cooldownMinutes * 60 * 1000);
}

if (suppressed_until && suppressed_until < now) {
  suppressed = false;
}

    let is_disabled = false;
    let disabled_reason = "";
    let disabled_at = null;

    if (totalPlays >= disableMinTotalPlays && successRate < disableThreshold) {
      is_disabled = true;
      disabled_reason = "low_lifetime_success_rate";
      disabled_at = now;
    }

    ops.push({
      updateOne: {
        filter: { channel_id },
        update: {
          $set: {
            channel_id,
            total_plays: totalPlays,
            total_fails: totalFails,

            recent_plays: recentPlays,
            recent_fails: recentFails,

            success_rate: Number(successRate.toFixed(4)),
            recent_success_rate: Number(recentSuccessRate.toFixed(4)),

            health_score,
            tier,

            avg_watch_time,

            suppressed,
            suppressed_reason,
            suppressed_until,

            is_disabled,
            disabled_reason,
            disabled_at,

            last_updated: now,

            meta: { ...(prev.meta || {}), stop_sum: stopSum, stop_count: stopCount },
          },
        },
        upsert: true,
      },
    });
  }

  console.log("OPS LENGTH:", ops.length);

if (ops.length) {
  await ChannelHealth.bulkWrite(ops);
  console.log("CHANNEL HEALTH UPDATED");
}

  await HealthCursor.updateOne(
    { key: cursorKey, locked_by: WORKER_ID },
    {
      $set: {
        last_processed_at: nextCursor,
        lock_expires_at: new Date(now.getTime() + 5 * 1000),
      },
    }
  );

  const updatedHealth =
  ops.length > 0
    ? await ChannelHealth.find({ channel_id: { $in: channelIds } })
        .select(
          "channel_id health_score tier suppressed suppressed_reason suppressed_until is_disabled disabled_reason disabled_at"
        )
        .lean()
    : [];

return {
  updated: ops.length,
  processedEvents: events.length,
  health: updatedHealth,
};
}
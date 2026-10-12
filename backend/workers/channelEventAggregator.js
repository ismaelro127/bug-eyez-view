import { getRedis } from "../config/redis.js";
import ChannelMinuteStats from "../models/ChannelMinuteStats.js";

const BATCH_SIZE = 5000;

function minuteBucket(ts) {
  return Math.floor(ts / 60000);
}

export async function processEventBatch() {
  const redis = getRedis();
let events = [];

if (redis) {
  for (let i = 0; i < BATCH_SIZE; i++) {
    const raw = await redis.rpop("channel:events");
    if (!raw) break;
try {
  events.push(JSON.parse(raw));
} catch {
  continue;
}  }
} else {
  // fallback to Mongo events
  const Event = (await import("../models/Event.js")).default;

  events = await Event.find()
    .sort({ createdAt: 1 })
    .limit(BATCH_SIZE)
    .lean()
    .then(rows =>
      rows.map(e => ({
        channel_id: e.channel_id,
        type: e.type,
        ts: new Date(e.createdAt).getTime()
      }))
    );
}

if (!events.length) return { processed: 0 };
  const agg = new Map();

  for (const e of events) {
    const bucket = minuteBucket(e.ts);
    const key = `${e.channel_id}:${bucket}`;

    if (!agg.has(key)) {
      agg.set(key, {
        channel_id: e.channel_id,
        minute_bucket: bucket,
        plays: 0,
        fails: 0,
      });
    }

    const row = agg.get(key);

    if (e.type === "channel-play-started") row.plays++;
    if (e.type === "channel-play-failed") row.fails++;
  }

  const ops = [];

  for (const row of agg.values()) {
    ops.push({
      updateOne: {
        filter: {
          channel_id: row.channel_id,
          minute_bucket: row.minute_bucket,
        },
        update: {
          $inc: {
            plays: row.plays,
            fails: row.fails,
          },
        },
        upsert: true,
      },
    });
  }

  if (ops.length) {
    await ChannelMinuteStats.bulkWrite(ops, { ordered: false });
  }

  return { processed: events.length };
}
import { getSupabase } from "./supabase.js";
import { logger } from "../utils/logger.js";

const DECAY_WINDOW_DAYS = 30;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const REQUEST_TIMEOUT_MS = 5000;

const stabilityCache = new Map(); // channelId -> { value, expiresAt }
const pendingRequests = new Map(); // channelId -> Promise

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("SUPABASE_TIMEOUT")), ms)
    ),
  ]);
}

/**
 * Production-safe stability computation
 */
export async function computeChannelStability(channelId) {
  const supabase = getSupabase();
  if (!supabase) {
    return null;
  }

  if (!channelId) return null;

  const now = Date.now();

  // 1️⃣ Serve from cache if valid
  const cached = stabilityCache.get(channelId);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  // 2️⃣ Prevent duplicate concurrent requests
  if (pendingRequests.has(channelId)) {
    return pendingRequests.get(channelId);
  }

  const requestPromise = (async () => {
    try {
      const query = supabase
        .from("ai_channel_patterns")
        .select("start_time, end_time, observed_at")
        .eq("channel_id", channelId)
        .order("observed_at", { ascending: false })
        .limit(100);

      const { data, error } = await withTimeout(
        query.then(res => res),
        REQUEST_TIMEOUT_MS
      );
            if (error || !data?.length) {
              return null;
       }

      let liveWeight = 0;
      let endedWeight = 0;

      for (const row of data) {
        if (!row.observed_at) continue;

        const observedAt = new Date(row.observed_at).getTime();
        const ageDays = (now - observedAt) / MS_PER_DAY;

        const decay = Math.max(0.05, 1 - ageDays / DECAY_WINDOW_DAYS);

        const isLive =
          !row.end_time || new Date(row.end_time).getTime() > now;

        if (isLive) {
          liveWeight += decay;
        } else {
          endedWeight += decay;
        }
      }

      const total = liveWeight + endedWeight;

      const result =
        total === 0
          ? 0
          : Number((liveWeight / total).toFixed(3));

      // 3️⃣ Cache result
      stabilityCache.set(channelId, {
        value: result,
        expiresAt: now + CACHE_TTL_MS,
      });
if (stabilityCache.size > 5000) {
  for (const [key, value] of stabilityCache) {
    if (value.expiresAt <= now) {
      stabilityCache.delete(key);
    }
  }
}
      return result;
    } catch (err) {
      logger.error("⚠ Stability computation failed:", err.message);
      return null;
    } finally {
      pendingRequests.delete(channelId);
    }
  })();

  pendingRequests.set(channelId, requestPromise);

  return requestPromise;
}

let batchCache = null;
let batchCacheExpires = 0;

export async function computeAllChannelStability() {
  const supabase = getSupabase();
  if (!supabase) return [];

  const now = Date.now();

  if (batchCache && batchCacheExpires > now) {
    return batchCache;
  }

  try {
    const { data, error } = await supabase
      .from("ai_channel_patterns")
      .select("channel_id, end_time, observed_at")
      .order("observed_at", { ascending: false })
      .limit(2000);

    if (error || !data?.length) return [];

    const grouped = new Map();

    for (const row of data) {
      if (!row.channel_id || !row.observed_at) continue;

      if (!grouped.has(row.channel_id)) {
        grouped.set(row.channel_id, []);
      }

      grouped.get(row.channel_id).push(row);
    }

    const results = [];

    for (const [channelId, rows] of grouped.entries()) {
      let liveWeight = 0;
      let endedWeight = 0;

      for (const row of rows) {
        const observedAt = new Date(row.observed_at).getTime();
        const ageDays = (now - observedAt) / MS_PER_DAY;
        const decay = Math.max(0.05, 1 - ageDays / DECAY_WINDOW_DAYS);

        const isLive =
          !row.end_time || new Date(row.end_time).getTime() > now;

        if (isLive) liveWeight += decay;
        else endedWeight += decay;
      }

      const total = liveWeight + endedWeight;
      const stability =
        total === 0 ? 0 : Number((liveWeight / total).toFixed(3));

      results.push({
        channel_id: channelId,
        stability,
        total_observations: rows.length,
        last_seen_live: rows[0]?.observed_at ?? null,
      });
    }

    batchCache = results;
    batchCacheExpires = now + CACHE_TTL_MS;

    return results;
  } catch (err) {
    logger.error("Batch stability failed:", err.message);
    return [];
  }
}
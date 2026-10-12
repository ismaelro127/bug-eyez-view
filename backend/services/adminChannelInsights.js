import { getSupabase } from "../lib/supabase.js";
import { logger } from "../utils/logger.js";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const RECENT_DAYS = 3;
const CACHE_TTL_MS = 5 * 60 * 1000;

let cache = null;
let cacheExpires = 0;

export async function getAdminChannelInsights() {
  const supabase = getSupabase();
  if (!supabase) return emptyResult();

  const now = Date.now();

  // Serve from cache
  if (cache && cacheExpires > now) {
    return cache;
  }

  try {
    const { data, error } = await supabase
      .from("ai_channel_patterns")
      .select("channel_id, observed_at, end_time")
      .order("observed_at", { ascending: false })
      .limit(2000);

    if (error || !data?.length) {
      logger.warn("Admin insights: no data");
      return emptyResult();
    }

    const grouped = new Map();

    for (const row of data) {
      if (!row.channel_id || !row.observed_at) continue;

      if (!grouped.has(row.channel_id)) {
        grouped.set(row.channel_id, []);
      }

      grouped.get(row.channel_id).push(row);
    }

    const stats = [];

    for (const [channelId, rows] of grouped.entries()) {
      let live = 0;
      let ended = 0;

      for (const row of rows) {
        const isLive =
          !row.end_time ||
          new Date(row.end_time).getTime() > now;

        if (isLive) live++;
        else ended++;
      }

      const total = live + ended;
      const stability = total === 0 ? 0 : live / total;

      stats.push({
        channel_id: channelId,
        stability: Number(stability.toFixed(3)),
        total_observations: total,
        last_seen_live: rows[0]?.observed_at ?? null,
      });
    }

    const topStable = stats
      .filter(s => s.total_observations >= 5 && s.stability >= 0.85)
      .sort((a, b) => b.stability - a.stability)
      .slice(0, 10);

    const unstable = stats
      .filter(s => s.total_observations >= 3 && s.stability <= 0.4)
      .sort((a, b) => a.stability - b.stability)
      .slice(0, 10);

    const recentlyDead = stats.filter(s => {
      if (!s.last_seen_live) return true;
      const ageDays =
        (now - new Date(s.last_seen_live).getTime()) / MS_PER_DAY;
      return ageDays >= RECENT_DAYS;
    });

    const rising = stats.filter(s => {
      if (!s.last_seen_live) return false;
      const ageDays =
        (now - new Date(s.last_seen_live).getTime()) / MS_PER_DAY;
      return s.stability >= 0.6 && ageDays <= 1;
    });

    const result = {
      topStable,
      unstable,
      rising,
      recentlyDead,
      totalTracked: stats.length,
    };

    cache = result;
    cacheExpires = now + CACHE_TTL_MS;

    return result;
  } catch (err) {
    logger.error("Admin insights failed:", err.message);
    return emptyResult();
  }
}

function emptyResult() {
  return {
    topStable: [],
    unstable: [],
    rising: [],
    recentlyDead: [],
    totalTracked: 0,
  };
}
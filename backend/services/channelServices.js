import fs from "fs";
import path from "path";
import UnlockedChannel from "../models/UnlockedChannel.js";
import ChannelHealth from "../models/ChannelHealth.js";

export async function getUserChannels(userId, LOCKED_CHANNEL_IDS) {
  const filePath = path.join(process.cwd(), "legal_verified_channels.json");

const channels = JSON.parse(
  fs.readFileSync(filePath, "utf8")
);

  const unlockedDocs = await UnlockedChannel.find(
    { userId },
    { channelId: 1 }
  ).lean();

  const unlocked = new Set(unlockedDocs.map((d) => d.channelId));

  const ids = channels.map((c) => c.id).filter(Boolean);

  const healthRows = await ChannelHealth.find(
    { channel_id: { $in: ids } },
    {
      channel_id: 1,
      health_score: 1,
      tier: 1,
      suppressed: 1,
      is_disabled: 1,
      avg_watch_time: 1,
      suppressed_until: 1,
      disabled_reason: 1,
      suppressed_reason: 1,
    }
  ).lean();

  const healthMap = new Map(healthRows.map((h) => [h.channel_id, h]));

  return channels.map((ch) => {
    const h = healthMap.get(ch.id);

    return {
      ...ch,
      locked: LOCKED_CHANNEL_IDS.has(ch.id) && !unlocked.has(ch.id),
      health: h
        ? {
            health_score: h.health_score ?? 100,
            tier: h.tier ?? "high",
            suppressed: !!h.suppressed,
            suppressed_until: h.suppressed_until ?? null,
            suppressed_reason: h.suppressed_reason ?? "",
            is_disabled: !!h.is_disabled,
            disabled_reason: h.disabled_reason ?? "",
            avg_watch_time: h.avg_watch_time ?? 0,
          }
        : null,
    };
  });
}
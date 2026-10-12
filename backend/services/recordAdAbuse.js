import UserFeatures from "../models/UserFeatures.js";
import { applyEscalation } from "./abuseEscalation.js";
import { getRedis } from "../config/redis.js";

const ABUSE_POINTS = {
  AD_DUPLICATE: 1,
  AD_COOLDOWN: 2,
  DAILY_AD_LIMIT: 3,
  INSUFFICIENT_CREDITS: 5,
  RAPID_UNLOCK: 8,
  TAMPERED_AD_PROOF: 10,
  RAPID_ACTIVITY: 6,
};

const MAX_ABUSE_SCORE = 100;
const SUPPRESS_SECONDS = 30;

export async function recordAdAbuse(userId, reason, meta = {}) {
  if (typeof reason !== "string" || !userId) return;

  const suppressKey = `abuse:${userId}:${reason}`;
  const exists = await redis.get(suppressKey);
  if (exists) return;

  await redis.set(suppressKey, "1", "EX", SUPPRESS_SECONDS);

  const points = ABUSE_POINTS[reason] ?? 1;
  const now = new Date();

  const result = await UserFeatures.findOneAndUpdate(
    { userId },
    [
      {
        $set: {
          abuseScore: {
            $min: [
              { $add: ["$abuseScore", points] },
              MAX_ABUSE_SCORE,
            ],
          },
          recentViolations: { $add: ["$recentViolations", 1] },
          lastAbuseAt: now,
        },
      },
      {
        $set: {
          abuseLog: {
            $slice: [
              {
                $concatArrays: [
                  { $ifNull: ["$abuseLog", []] },
                  [
                    {
                      reason,
                      points,
                      at: now,
                      meta,
                    },
                  ],
                ],
              },
              -100,
            ],
          },
        },
      },
    ],
    { upsert: true, new: true }
  );

  // 🔥 Only escalate if threshold boundary crossed
  if (result) {
    const score = result.abuseScore;

    if (
      score === 6 ||
      score === 20 ||
      score === 40
    ) {
      await applyEscalation(userId);
    }
  }
}

function getAbuseWeight(reason) {
  switch (reason) {
    case "AD_DUPLICATE":
      return 2;

    case "DEVICE_DAILY_LIMIT":
    case "DEVICE_BURST_LIMIT":
      return 3;

    case "RAPID_ACTIVITY":
      return 4;

    case "IP_AD_LIMIT":
      return 5;

    case "SHADOW_RESTRICTED":
      return 10;

    default:
      return 1;
  }
}
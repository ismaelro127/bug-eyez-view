import { getRedis } from "../config/redis.js";
import { recordAdAbuse } from "./recordAdAbuse.js";
import { applyEscalation } from "./abuseEscalation.js";
import { isAdShadowBanned } from "./isAdShadowBanned.js";
import { isUnlockRestricted } from "./isUnlockRestricted.js";

const ABUSE_SUPPRESSION_SECONDS = 30;

export async function handleAdAbuse({
  userId,
  reason,
  context = {},
}) {
  if (typeof reason !== "string") {
    return;
  }

  const suppressKey = `abuse:${userId}:${reason}`;

  // 🧠 Redis suppression window (prevents spam writes)
  const exists = await redis.get(suppressKey);
  if (exists) return;

  await redis.set(
    suppressKey,
    "1",
    "EX",
    ABUSE_SUPPRESSION_SECONDS
  );

  // 📒 Record durable abuse event
  await recordAdAbuse(userId, reason, context);

  // 🔥 Immediate escalation check
  await applyEscalation(userId);
}

export { isAdShadowBanned };
export { isUnlockRestricted };
export { decayAbuseScores } from "./abuseDecay.js";
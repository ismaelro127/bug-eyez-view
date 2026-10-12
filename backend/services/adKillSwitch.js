import { getRedis } from "../config/redis.js";

const KEY = "ad_rewards:disabled";

export async function isAdRewardsDisabled() {
  const redis = getRedis();
  if (!redis) return false; // fail open (ads enabled)

  return (await redis.get(KEY)) === "1";
}

export async function disableAdRewards() {
  const redis = getRedis();
  if (!redis) return;

  await redis.set(KEY, "1");
}

export async function enableAdRewards() {
  const redis = getRedis();
  if (!redis) return;

  await redis.del(KEY);
}

import UserFeatures from "../models/UserFeatures.js";

export async function getAbuseStats(userId, { admin = false } = {}) {
  const features = await UserFeatures.findOne(
    { userId },
    {
      abuseScore: 1,
      recentViolations: 1,
      trustTier: 1,
      totalRewardedAds: 1,
      restrictedUntil: 1,
      lastAbuseAt: 1,
      abuseLog: admin ? 1 : 0, // only load if admin
    }
  ).lean();

  if (!features) return null;

  const response = {
    abuseScore: features.abuseScore ?? 0,
    recentViolations: features.recentViolations ?? 0,
    trustTier: features.trustTier ?? "normal",
    totalRewardedAds: features.totalRewardedAds ?? 0,
    restrictedUntil: features.restrictedUntil ?? null,
    shadowRestricted: features.trustTier === "shadow",
    lastAbuseAt: features.lastAbuseAt ?? null,
  };

  if (admin && Array.isArray(features.abuseLog)) {
    response.abuseLog = features.abuseLog.slice(-5);
  }

  return response;
}
import UserFeatures from "../models/UserFeatures.js";

export async function getOrCreateUserFeatures(userId) {
  let features = await UserFeatures.findOne({ userId });

  if (!features) {
    features = await UserFeatures.create({
      userId,
      trustTier: "normal",
      unlockedChannels: [],
      totalRewardedAds: 0,
    });
  }

  return features;
}

export async function unlockChannelForUser(userId, channelId) {
  const features = await getOrCreateUserFeatures(userId);

  if (!features.unlockedChannels.includes(channelId)) {
    features.unlockedChannels.push(channelId);
  }

  await features.save();
  return features;
}

export async function addRewardedAdCredit(userId, deviceHash) {
  const features = await getOrCreateUserFeatures(userId);

  features.totalRewardedAds += 1;
  features.lastDeviceHash = deviceHash || features.lastDeviceHash;

  await features.save();
  return features;
}

export async function addAbusePoints(userId, reason, points, meta = {}) {
  const features = await getOrCreateUserFeatures(userId);

  features.abuseScore += points;
  features.recentViolations += 1;
  features.lastAbuseAt = new Date();

  features.abuseLog.push({
    reason,
    points,
    meta,
  });

  if (!features.trustTierLocked) {
    if (features.abuseScore >= 50) {
      features.trustTier = "shadow";
    } else if (features.abuseScore >= 25) {
      features.trustTier = "restricted";
    }
  }

  await features.save();
  return features;
}
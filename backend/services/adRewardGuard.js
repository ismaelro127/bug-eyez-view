// backend/services/adRewardGuard.js

import CreditLedger from "../models/CreditLedger.js";
import UserFeatures from "../models/UserFeatures.js";
import { recordAdAbuse } from "./recordAdAbuse.js";

// ------------------------------------
// TRUST-BASED LIMITS (industry style)
// ------------------------------------
const TRUST_LIMITS = {
  trusted: {
    cooldownSec: 20,
    dailyAds: 60,
    deviceDaily: 50,
  },
  normal: {
    cooldownSec: 60,
    dailyAds: 20,
    deviceDaily: 30,
  },
  restricted: {
    cooldownSec: 180,
    dailyAds: 5,
    deviceDaily: 5,
  },
  shadow: {
    cooldownSec: Infinity,
    dailyAds: 0,
    deviceDaily: 0,
  },
};

const DEVICE_BURST_LIMIT = 6;
const DEVICE_BURST_WINDOW_MS = 10 * 60 * 1000;

export async function assertAdRewardAllowed({
  userId,
  rewardKey,
  deviceHash = null,
  ip = null,
}) {
  const now = new Date();

  // ---------------------------
  // Load or init features
  // ---------------------------
  const features =
    (await UserFeatures.findOne({ userId })) ??
    (await UserFeatures.create({ userId }));

  const trustTier = features.trustTier || "normal";
  const abuseScore = features.abuseScore || 0;
  const limits = TRUST_LIMITS[trustTier];

  // ---------------------------
  // 0️⃣ Shadow users = silent block
  // ---------------------------
  if (trustTier === "shadow") {
    throw Object.assign(new Error("Shadow restricted"), {
      code: "SHADOW_RESTRICTED",
    });
  }

  // ---------------------------
  // 1️⃣ Idempotency
  // ---------------------------
  const dup = await CreditLedger.findOne({
    userId,
    refType: "ad_reward",
    refId: rewardKey,
  });

  if (dup) {
    await recordAdAbuse(userId, "AD_DUPLICATE", { rewardKey });
    throw Object.assign(new Error("Duplicate ad"), {
      code: "AD_DUPLICATE",
    });
  }

  // ---------------------------
  // 2️⃣ Adaptive cooldown
  // ---------------------------
  const scaledCooldownMs =
    limits.cooldownSec * 1000 * (1 + abuseScore / 5);

  const last = await CreditLedger.findOne({
    userId,
    refType: "ad_reward",
  }).sort({ createdAt: -1 });

  if (last) {
    const elapsed = now - last.createdAt;
    const remaining = scaledCooldownMs - elapsed;

    if (remaining > 0) {
      await recordAdAbuse(userId, "AD_COOLDOWN", {
        remainingMs: remaining,
        trustTier,
        abuseScore,
      });

      throw Object.assign(new Error("Cooldown active"), {
        code: "AD_COOLDOWN",
        cooldownRemainingMs: remaining,
      });
    }
  }

  // ---------------------------
  // 3️⃣ Daily user limit
  // ---------------------------
  const sinceDay = new Date();
  sinceDay.setHours(0, 0, 0, 0);

  const todayCount = await CreditLedger.countDocuments({
    userId,
    refType: "ad_reward",
    createdAt: { $gte: sinceDay },
  });

  if (todayCount >= limits.dailyAds) {
    await recordAdAbuse(userId, "DAILY_AD_LIMIT", {
      trustTier,
      count: todayCount,
    });

    throw Object.assign(new Error("Daily ad limit"), {
      code: "DAILY_AD_LIMIT",
    });
  }

  // ---------------------------
  // 4️⃣ Device fingerprint limits
  // ---------------------------
  const effectiveDeviceHash =
    deviceHash || features.lastDeviceHash || null;

  if (effectiveDeviceHash) {
    const deviceDailyCount = await CreditLedger.countDocuments({
      refType: "ad_reward",
      "meta.deviceHash": effectiveDeviceHash,
      createdAt: { $gte: sinceDay },
    });

    if (deviceDailyCount >= limits.deviceDaily) {
      await recordAdAbuse(userId, "DEVICE_DAILY_LIMIT", {
        deviceHash: effectiveDeviceHash,
        count: deviceDailyCount,
      });

      throw Object.assign(new Error("Device daily limit"), {
        code: "DEVICE_DAILY_LIMIT",
      });
    }

    const burstSince = new Date(
      Date.now() - DEVICE_BURST_WINDOW_MS
    );

    const burstCount = await CreditLedger.countDocuments({
      refType: "ad_reward",
      "meta.deviceHash": effectiveDeviceHash,
      createdAt: { $gte: burstSince },
    });

    if (burstCount >= DEVICE_BURST_LIMIT) {
      await recordAdAbuse(userId, "RAPID_ACTIVITY", {
        deviceHash: effectiveDeviceHash,
        burstCount,
      });

      throw Object.assign(new Error("Rapid activity"), {
        code: "DEVICE_BURST_LIMIT",
      });
    }

    // Cache device hash safely
    if (features.lastDeviceHash !== effectiveDeviceHash) {
      features.lastDeviceHash = effectiveDeviceHash;
      await features.save();
    }
  }

  // ---------------------------
  // 5️⃣ IP velocity (soft)
  // ---------------------------
  if (ip) {
    const ipCount = await CreditLedger.countDocuments({
      refType: "ad_reward",
      ip,
      createdAt: { $gte: sinceDay },
    });

    if (ipCount >= 30) {
      await recordAdAbuse(userId, "RAPID_ACTIVITY", { ip });
      throw Object.assign(new Error("IP rate limit"), {
        code: "IP_AD_LIMIT",
      });
    }
  }

  // ✅ Reward allowed
  return true;
}

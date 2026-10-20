import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";

import { mintCredits } from "../services/mintCredits.js";
import { assertAdRewardAllowed } from "../services/adRewardGuard.js";
import { spendCredits } from "../services/spendCredits.js";
import UserBalance from "../models/UserBalance.js";
import CreditLedger from "../models/CreditLedger.js";
import UnlockedChannel from "../models/UnlockedChannel.js";
import UserFeatures from "../models/UserFeatures.js";
import adAwardLimiter from "../middleware/adAwardLimiter.js";
import { isAdRewardsDisabled } from "../services/adKillSwitch.js";
import { logger } from "../utils/logger.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  handleAdAbuse,
  isAdShadowBanned,
} from "../services/abuseService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LEGAL_CHANNELS_FILE = path.join(
  __dirname,
  "../../frontend/public/legal_verified_channels.json"
);

function getLegalChannelById(channelId) {
  try {
    if (!channelId || typeof channelId !== "string") {
      return null;
    }

const raw = fs.readFileSync(LEGAL_CHANNELS_FILE, "utf8");    const channels = JSON.parse(raw);

    if (!Array.isArray(channels)) {
      logger.error("Legal channel registry is not an array");
      return null;
    }

    return channels.find((ch) => ch.id === channelId) || null;
  } catch (err) {
    logger.error(
      {
        err: {
          message: err?.message,
          stack: err?.stack,
        },
      },
      "Failed to read legal channel registry"
    );

    return null;
  }
}

function isUnavailableYoutubeAutoChannel(channel) {
  return (
    channel?.delivery === "youtube" &&
    channel?.source === "youtube_auto" &&
    (
      channel.offline === true ||
      channel.isLive === false ||
      channel.live === false ||
      channel.unlockDisabled === true ||
      channel.status === "offline" ||
      channel.live_status === "offline"
    )
  );
}

const router = express.Router();

// 🔒 ALL routes below require auth
router.use(authMiddleware);

const SKIP_ADS_COST = 10;
const SKIP_ADS_MINUTES = 30;
const UNLOCK_CHANNEL_COST = 25;

/**
 * ================================
 * POST /api/credits/award
 * Reward credits for watching an ad
 * ================================
 */
/**
 * POST /api/credits/award
 */
router.post("/award", adAwardLimiter, async (req, res) => {
  const userId = req.user?._id?.toString();

  

  try {
    if (!userId) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }

    const {
      adSessionId,
      durationWatched,
      adType = "rewarded_video",
      reason = "completed",
      channelId = null,
      deviceHash: rawDeviceHash = null,
      effectiveDeviceHash = null,
    } = req.body;

    const deviceHash = rawDeviceHash || effectiveDeviceHash || null;

    // ---------------------------
    // 1️⃣ Ad session sanity
    // ---------------------------
    if (
      !adSessionId ||
      !adSessionId.startsWith("ad_") ||
      adSessionId.length < 20
    ) {
      return res.status(400).json({ error: "INVALID_AD_SESSION" });
    }

    // ---------------------------
    // 2️⃣ Duration validation
    // ---------------------------
    if (
      typeof durationWatched !== "number" ||
      Number.isNaN(durationWatched)
    ) {
      return res.status(400).json({ error: "INVALID_DURATION" });
    }

    const allowedReasons = ["completed", "skipped_after_delay"];

    if (!allowedReasons.includes(reason)) {
      return res.status(400).json({
        error: "INVALID_AD_REASON",
        reason,
      });
    }

    const minRequiredSeconds =
      reason === "skipped_after_delay" ? 5 : 10;

    if (durationWatched < minRequiredSeconds) {
      await handleAdAbuse({
        userId,
        reason: "TAMPERED_AD_PROOF",
        context: {
          durationWatched,
          required: minRequiredSeconds,
          adSessionId,
          reason,
        },
      });

      return res.json({ ok: true, shadowed: true });
    }

    // ---------------------------
    // 3️⃣ Ad type lock
    // ---------------------------
    if (adType !== "rewarded_video") {
      return res.status(400).json({ error: "INVALID_AD_TYPE" });
    }

    // ---------------------------
    // 4️⃣ Guard cooldown / duplicate / limits
    // ---------------------------
    await assertAdRewardAllowed({
      userId,
      rewardKey: adSessionId,
      deviceHash,
      ip: req.ip,
    });

    // ---------------------------
    // 5️⃣ Reward amount
    // ---------------------------
    const features = await UserFeatures.findOne({ userId }).lean();
    const trustTier = features?.trustTier ?? "normal";

    function pickRewardAmount(tier) {
      if (tier === "restricted") return 3;
      if (tier === "shadow") return 0;

      const roll = Math.random();
      if (roll < 0.1) return 0;
      if (roll < 0.3) return 4;
      if (roll < 0.9) return 5;
      return 6;
    }

    const amount = pickRewardAmount(trustTier);

    if (amount === 0) {
      return res.json({ ok: true, shadowed: true });
    }

    
    // ---------------------------
    // 6️⃣ Mint credits
    // ---------------------------
    let result;

    try {
      result = await mintCredits({
        userId,
        amount,
        reason: "rewarded_ad",
        source: "ad",
        refType: "ad_reward",
        refId: adSessionId,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        meta: {
          deviceHash,
          durationWatched,
          adType,
          rewardReason: reason,
          channelId,
        },
      });

      console.log("✅ CREDITS MINTED", result);
    } catch (mintErr) {
      console.error("❌ mintCredits failed:", {
        message: mintErr?.message,
        code: mintErr?.code,
        name: mintErr?.name,
        stack: mintErr?.stack,
      });

      throw mintErr;
    }

return res.json({
  ok: true,
  amount,
  credits: result?.credits ?? null,
  reward: {
    reason,
    durationWatched,
    channelId,
  },
});
  } catch (err) {
    logger.error(
      {
        err: {
          message: err?.message,
          stack: err?.stack,
          name: err?.name,
          code: err?.code,
          cooldownRemainingMs: err?.cooldownRemainingMs,
        },
        body: req.body,
        userId,
      },
      "❌ AWARD ERROR"
    );

    if (userId && err?.code) {
      await handleAdAbuse({
        userId,
        reason: err.code,
        context: {
          rewardKey: req.body?.adSessionId,
          ip: req.ip,
          error: err?.message,
          code: err?.code,
          durationWatched: req.body?.durationWatched,
          reason: req.body?.reason,
        },
      });
    }

    if (await isAdRewardsDisabled()) {
      return res.json({ ok: true, shadowed: true });
    }

    return res.status(400).json({
      error: err.message || "AD_REWARD_FAILED",
      code: err.code,
      cooldownRemainingMs: err.cooldownRemainingMs,
    });
  }
});    
/**
 * ================================
 * GET /api/credits/balance
 * ================================
 */
router.get("/balance", async (req, res) => {
  try {
    const userId = req.user._id;
    const balance = await UserBalance.findOne({ userId }).lean();

    res.json({ credits: balance?.credits ?? 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * ================================
 * GET /api/credits/ledger
 * ================================
 */
router.get("/ledger", async (req, res) => {
  try {
    const userId = req.user._id;

    const ledger = await CreditLedger.find({ userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json({ ledger });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * ================================
 * POST /api/credits/spend/unlock-channel
 * ================================
 */
const YOUTUBE_PACK_UNLOCK_COST = 100;

/**
 * ================================
 * POST /api/credits/spend/unlock-youtube-pack
 * Unlock all currently playable YouTube channels
 * ================================
 */
router.post("/spend/unlock-youtube-pack", async (req, res) => {
  const userId = req.user._id;

  try {
    const raw = fs.readFileSync(LEGAL_CHANNELS_FILE, "utf8");
    const allChannels = JSON.parse(raw);

    if (!Array.isArray(allChannels)) {
      return res.status(500).json({
        error: "INVALID_CHANNEL_REGISTRY",
        message: "Channel registry is not an array.",
      });
    }

    const youtubeChannels = allChannels.filter((channel) => {
      const isYoutube =
        channel.delivery === "youtube" ||
        channel.type === "youtube" ||
        channel.category === "YouTube Live";

      const isOffline =
        channel.offline === true ||
        channel.isLive === false ||
        channel.unlockDisabled === true ||
        channel.status === "offline" ||
        channel.live_status === "offline";

      return isYoutube && !isOffline && channel.id;
    });

    if (!youtubeChannels.length) {
      return res.status(409).json({
        error: "NO_PLAYABLE_YOUTUBE_CHANNELS",
        message: "No playable YouTube channels are available right now.",
      });
    }

    const youtubeChannelIds = youtubeChannels.map((channel) => channel.id);

    // If user already has every playable YouTube channel unlocked, don't charge again.
    const existingUnlocks = await UnlockedChannel.find({
      userId,
      channelId: { $in: youtubeChannelIds },
    }).lean();

    const existingUnlockedIds = new Set(
      existingUnlocks.map((unlock) => unlock.channelId)
    );

    const missingChannelIds = youtubeChannelIds.filter(
      (channelId) => !existingUnlockedIds.has(channelId)
    );

    if (!missingChannelIds.length) {
      return res.json({
        ok: true,
        alreadyUnlocked: true,
        youtubePackUnlocked: true,
        unlockedChannelIds: youtubeChannelIds,
        unlockCost: 0,
      });
    }

    // Spend once for the whole YouTube pack.
    const result = await spendCredits({
      userId,
      cost: YOUTUBE_PACK_UNLOCK_COST,
      action: "unlock_youtube_pack",
      source: "user",
      refId: `unlock_youtube_pack_${userId}`,
      meta: {
        pack: "youtube",
        channelCount: youtubeChannels.length,
        unlockedCount: missingChannelIds.length,
      },
    });

    // Grant all missing YouTube unlocks.
    await UnlockedChannel.insertMany(
      missingChannelIds.map((channelId) => ({
        userId,
        channelId,
      })),
      { ordered: false }
    );

    res.json({
      ok: true,
      credits: result.credits,
      youtubePackUnlocked: true,
      unlockedChannelIds: youtubeChannelIds,
      unlockCost: YOUTUBE_PACK_UNLOCK_COST,
    });
  } catch (err) {
    res.status(400).json({
      error: err.code || "YOUTUBE_PACK_UNLOCK_FAILED",
      message: err.message,
    });
  }
});

router.post("/spend/unlock-channel", async (req, res) => {
  const userId = req.user._id;

  try {
    const { channelId } = req.body;

    if (!channelId) {
      return res.status(400).json({ error: "MISSING_CHANNEL_ID" });
    }

    const channel = getLegalChannelById(channelId);

    if (!channel) {
      return res.status(404).json({
        error: "CHANNEL_NOT_FOUND",
        message: "This channel is no longer available.",
      });
    }

    if (
      channel.delivery === "youtube" &&
      channel.source === "youtube_auto" &&
      (channel.offline === true ||
        channel.isLive === false ||
        channel.unlockDisabled === true ||
        channel.status === "offline")
    ) {
      return res.status(409).json({
        error: "CHANNEL_OFFLINE",
        message: "This YouTube live channel is currently offline.",
      });
    }

    const unlockCost = Number(channel.unlockCost ?? UNLOCK_CHANNEL_COST);

    // Prevent double unlock
    const already = await UnlockedChannel.findOne({ userId, channelId });
    if (already) {
      return res.json({
        ok: true,
        alreadyUnlocked: true,
        channelId,
      });
    }

    // 💸 Spend credits only after channel is confirmed available
    const result = await spendCredits({
      userId,
      cost: unlockCost,
      action: "unlock_channel",
      source: "user",
      refId: `unlock_${channelId}_${Date.now()}`,
      meta: {
        channelId,
        channelName: channel.name,
        delivery: channel.delivery,
        source: channel.source,
      },
    });

    // 🔓 Grant unlock
    await UnlockedChannel.create({
      userId,
      channelId,
    });

    res.json({
      ok: true,
      credits: result.credits,
      channelId,
      unlockCost,
    });
  } catch (err) {
    res.status(400).json({
      error: err.code || "UNLOCK_FAILED",
      message: err.message,
    });
  }
});

/**
 * ================================
 * GET /api/credits/user/unlocks
 * ================================
 */
router.get("/user/unlocks", async (req, res) => {
  const userId = req.user._id;

  const unlocks = await UnlockedChannel.find({ userId }).lean();

  res.json({
    unlockedChannelIds: unlocks.map((u) => u.channelId),
  });
});

/**
 * ================================
 * POST /api/credits/spend/skip-ads
 * ================================
 */
router.post("/spend/skip-ads", async (req, res) => {
  const userId = req.user._id;

  try {
    const result = await spendCredits({
      userId,
      cost: SKIP_ADS_COST,
      action: "skip_ads_30_min",
      source: "user",
      refId: `skip_ads_${Date.now()}`,
      meta: { durationMinutes: SKIP_ADS_MINUTES },
    });

    const until = new Date(Date.now() + SKIP_ADS_MINUTES * 60 * 1000);

    await UserFeatures.findOneAndUpdate(
      { userId },
      { skipAdsUntil: until },
      { upsert: true, new: true }
    );

    res.json({
      ok: true,
      credits: result.credits,
      skipAdsUntil: until,
    });
  } catch (err) {
    res.status(400).json({
      error: err.code || "SPEND_FAILED",
      message: err.message,
    });
  }
});

export default router;

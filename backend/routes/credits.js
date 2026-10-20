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

    const raw = fs.readFileSync(LEGAL_CHANNELS_FILE, "utf8");
    const channels = JSON.parse(raw);

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


function getPlayableYoutubeChannels() {
  try {
    const raw = fs.readFileSync(LEGAL_CHANNELS_FILE, "utf8");
    const channels = JSON.parse(raw);

    if (!Array.isArray(channels)) {
      logger.error("Legal channel registry is not an array");
      return [];
    }

    return channels.filter((channel) => {
      const isYoutube =
        channel?.delivery === "youtube" ||
        channel?.type === "youtube" ||
        channel?.category === "YouTube Live";

      if (!isYoutube) return false;
      if (isUnavailableYoutubeAutoChannel(channel)) return false;

      return true;
    });
  } catch (err) {
    logger.error(
      {
        err: {
          message: err?.message,
          stack: err?.stack,
        },
      },
      "Failed to read YouTube channel registry"
    );

    return [];
  }
}

async function getCurrentCredits(userId) {
  const balance = await UserBalance.findOne({ userId }).lean();
  return balance?.credits ?? 0;
}

const router = express.Router();

// ðŸ”’ ALL routes below require auth
router.use(authMiddleware);

const SKIP_ADS_COST = 10;
const SKIP_ADS_MINUTES = 30;
const UNLOCK_CHANNEL_COST = 25;
const YOUTUBE_PACK_UNLOCK_COST = 100;
const YOUTUBE_PACK_REF_ID = "unlock_youtube_pack_v1";
const INDIVIDUAL_CHANNEL_UNLOCK_MS = 24 * 60 * 60 * 1000;
const YOUTUBE_PACK_UNLOCK_MS = 24 * 60 * 60 * 1000;
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
    // 1ï¸âƒ£ Ad session sanity
    // ---------------------------
    if (
      !adSessionId ||
      !adSessionId.startsWith("ad_") ||
      adSessionId.length < 20
    ) {
      return res.status(400).json({ error: "INVALID_AD_SESSION" });
    }

    // ---------------------------
    // 2ï¸âƒ£ Duration validation
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
    // 3ï¸âƒ£ Ad type lock
    // ---------------------------
    if (adType !== "rewarded_video") {
      return res.status(400).json({ error: "INVALID_AD_TYPE" });
    }

    // ---------------------------
    // 4ï¸âƒ£ Guard cooldown / duplicate / limits
    // ---------------------------
    await assertAdRewardAllowed({
      userId,
      rewardKey: adSessionId,
      deviceHash,
      ip: req.ip,
    });

    // ---------------------------
    // 5ï¸âƒ£ Reward amount
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
    // 6ï¸âƒ£ Mint credits
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

      console.log("âœ… CREDITS MINTED", result);
    } catch (mintErr) {
      console.error("âŒ mintCredits failed:", {
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
      "âŒ AWARD ERROR"
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
    // Prevent charging again while this individual unlock is still active.
const now = new Date();

const already = await UnlockedChannel.findOne({
  userId,
  channelId,
  unlockType: "individual",
  expiresAt: { $gt: now },
}).lean();

if (already) {
  return res.json({
    ok: true,
    alreadyUnlocked: true,
    channelId,
    expiresAt: already.expiresAt,
  });
}

    // ðŸ’¸ Spend credits only after channel is confirmed available
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

    // Grant this individual channel for 24 hours.
const expiresAt = new Date(
  Date.now() + INDIVIDUAL_CHANNEL_UNLOCK_MS
);

await UnlockedChannel.findOneAndUpdate(
  { userId, channelId },
  {
    $set: {
      unlockType: "individual",
      expiresAt,
    },
  },
  {
    upsert: true,
    new: true,
  }
);

    res.json({
      ok: true,
      credits: result.credits,
      channelId,
      unlockCost,
      expiresAt,
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
 * POST /api/credits/spend/unlock-youtube-pack
 * Unlock all currently playable YouTube channels with one credit purchase
 * ================================
 */
router.post("/spend/unlock-youtube-pack", async (req, res) => {
  const userId = req.user._id;

  try {
    const existingFeatures = await UserFeatures.findOne({ userId }).lean();

const now = new Date();

const existingPackExpiresAt =
  existingFeatures?.youtubePackExpiresAt
    ? new Date(existingFeatures.youtubePackExpiresAt)
    : null;

const existingPackIsActive =
  existingFeatures?.youtubePackUnlocked === true &&
  existingPackExpiresAt !== null &&
  existingPackExpiresAt > now;

if (existingPackIsActive) {      const playableYoutubeChannels = getPlayableYoutubeChannels();
      const youtubeChannelIds = playableYoutubeChannels.map((channel) => channel.id);

      return res.json({
        ok: true,
        alreadyUnlocked: true,
        youtubePackUnlocked: true,
        unlockedChannelIds: youtubeChannelIds,
credits: await getCurrentCredits(userId),
expiresAt: youtubePackExpiresAt,
        unlockCost: 0,
      
        expiresAt: existingPackExpiresAt,
    });
    }

    const playableYoutubeChannels = getPlayableYoutubeChannels();
    const youtubeChannelIds = playableYoutubeChannels
      .map((channel) => channel.id)
      .filter(Boolean);

    if (!youtubeChannelIds.length) {
      return res.status(409).json({
        error: "NO_PLAYABLE_YOUTUBE_CHANNELS",
        message: "There are no playable YouTube channels available to unlock right now.",
      });
    }

    await spendCredits({
      userId,
      cost: YOUTUBE_PACK_UNLOCK_COST,
      action: "unlock_youtube_pack",
      source: "user",
      refId: `${YOUTUBE_PACK_REF_ID}_${Date.now()}`,
      meta: {
        unlockedCount: youtubeChannelIds.length,
        delivery: "youtube",
        pack: "youtube_all_live",
      },
    });

    const youtubePackExpiresAt = new Date(
  Date.now() + YOUTUBE_PACK_UNLOCK_MS
);

    await UserFeatures.findOneAndUpdate(
      { userId },
      {
        $set: {
  youtubePackUnlocked: true,
  youtubePackUnlockedAt: new Date(),
  youtubePackExpiresAt,
},
      },
      { upsert: true, new: true }
    );


    return res.json({
      ok: true,
      youtubePackUnlocked: true,
      unlockedChannelIds: youtubeChannelIds,
      unlockedCount: youtubeChannelIds.length,
      unlockCost: YOUTUBE_PACK_UNLOCK_COST,
      credits: await getCurrentCredits(userId),
    });
  } catch (err) {
    return res.status(400).json({
      error: err.code || "YOUTUBE_PACK_UNLOCK_FAILED",
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

  try {
    const now = new Date();

    const [unlocks, features] = await Promise.all([
      UnlockedChannel.find({
        userId,
        unlockType: "individual",
        expiresAt: { $gt: now },
      }).lean(),

      UserFeatures.findOne({ userId }).lean(),
    ]);

    const baseUnlockedIds = unlocks.map(
      (unlock) => unlock.channelId
    );

    const individualUnlocks = unlocks.map(
      (unlock) => ({
        channelId: unlock.channelId,
        expiresAt: unlock.expiresAt,
      })
    );

    const youtubePackExpiresAt =
      features?.youtubePackExpiresAt
        ? new Date(features.youtubePackExpiresAt)
        : null;

    const youtubePackUnlocked =
      features?.youtubePackUnlocked === true &&
      youtubePackExpiresAt !== null &&
      youtubePackExpiresAt > now;

    const youtubeChannelIds = youtubePackUnlocked
      ? getPlayableYoutubeChannels()
          .map((channel) => channel.id)
          .filter(Boolean)
      : [];

    const unlockedChannelIds = Array.from(
      new Set([
        ...baseUnlockedIds,
        ...youtubeChannelIds,
      ])
    );

    res.json({
      unlockedChannelIds,
      individualUnlocks,
      youtubePackUnlocked,
      youtubePackUnlockCost: YOUTUBE_PACK_UNLOCK_COST,
      youtubePackExpiresAt: youtubePackUnlocked
        ? youtubePackExpiresAt
        : null,
      youtubeUnlockedChannelIds: youtubeChannelIds,
    });
  } catch (err) {
    logger.error(
      {
        err: {
          message: err?.message,
          stack: err?.stack,
        },
        userId,
      },
      "Failed to load user unlocks"
    );

    res.status(500).json({
      error: "UNLOCK_LOAD_FAILED",
      message: err.message,
    });
  }
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



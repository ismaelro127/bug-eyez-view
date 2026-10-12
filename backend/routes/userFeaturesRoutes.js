import express from "express";
import User from "../models/User.js";
import {
  getOrCreateUserFeatures,
  unlockChannelForUser,
  addRewardedAdCredit,
} from "../services/userFeaturesService.js";

const router = express.Router();

/**
 * GET /api/user-features/me
 * Requires req.user.id from auth middleware
 */
router.get("/me", async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const [features, user] = await Promise.all([
      getOrCreateUserFeatures(userId),
      User.findById(userId)
        .select(
          "_id email username displayName avatarUrl provider roles emailVerified createdAt updatedAt"
        )
        .lean(),
    ]);

    if (!user) {
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }

    res.json({
      success: true,
      ok: true,
      user,
      features,
    });
  } catch (err) {
    console.error("Failed to load user features:", err);
    res.status(500).json({ error: "Failed to load user features" });
  }
});

/**
 * POST /api/user-features/unlock-channel
 */
router.post("/unlock-channel", async (req, res) => {
  try {
    const userId = req.user?.id;
    const { channelId } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!channelId) {
      return res.status(400).json({ error: "channelId is required" });
    }

    const features = await unlockChannelForUser(userId, channelId);

    res.json({
      success: true,
      unlockedChannels: features.unlockedChannels,
      features,
    });
  } catch (err) {
    console.error("Failed to unlock channel:", err);
    res.status(500).json({ error: "Failed to unlock channel" });
  }
});

/**
 * POST /api/user-features/rewarded-ad
 */
router.post("/rewarded-ad", async (req, res) => {
  try {
    const userId = req.user?.id;
    const { deviceHash } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const features = await addRewardedAdCredit(userId, deviceHash);

    res.json({
      success: true,
      totalRewardedAds: features.totalRewardedAds,
      features,
    });
  } catch (err) {
    console.error("Failed to update rewarded ad count:", err);
    res.status(500).json({ error: "Failed to update rewarded ad count" });
  }
});

export default router;
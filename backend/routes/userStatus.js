import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import UserFeatures from "../models/UserFeatures.js";
import User from "../models/User.js";

const router = express.Router();
router.use(authMiddleware);

router.get("/ad-status", async (req, res) => {
  const userId = req.user._id;
  const now = new Date();

  const features = await UserFeatures.findOne({ userId }).lean();

  const trustTier = features?.trustTier ?? "normal";

  const restrictedUntil =
    features?.restrictedUntil && features.restrictedUntil > now
      ? features.restrictedUntil
      : null;

  const skipAdsUntil =
    features?.skipAdsUntil && features.skipAdsUntil > now
      ? features.skipAdsUntil
      : null;

  const shadowed =
    trustTier === "shadow" ||
    (features?.abuseScore ?? 0) >= 6;

  const canEarnAds =
    !shadowed &&
    !restrictedUntil &&
    !skipAdsUntil;

  // 🎯 Adaptive cooldown (server truth)
  let cooldownSeconds = 60;
  if (trustTier === "trusted") cooldownSeconds = 30;
  if (trustTier === "restricted") cooldownSeconds = 180;

  res.json({
    trustTier,
    canEarnAds,
    shadowed,
    restrictedUntil,
    skipAdsUntil,
    cooldownSeconds,
  });
});

router.patch("/profile", async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }

    const { username, displayName } = req.body || {};

    const update = {};

    if (typeof username === "string") {
      const cleanUsername = username.trim().slice(0, 32);

      if (cleanUsername.length < 2) {
        return res.status(400).json({
          error: "INVALID_USERNAME",
          message: "Username must be at least 2 characters.",
        });
      }

      update.username = cleanUsername;
    }

    if (typeof displayName === "string") {
      update.displayName = displayName.trim().slice(0, 50);
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({
        error: "NO_PROFILE_FIELDS",
        message: "No profile fields were provided.",
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: update },
      {
        new: true,
        runValidators: true,
      }
    )
      .select(
        "_id email username displayName avatarUrl provider roles emailVerified createdAt updatedAt"
      )
      .lean();

    if (!user) {
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }

    return res.json({
      ok: true,
      user,
    });
  } catch (err) {
    console.error("Profile update failed:", err);

    if (err?.code === 11000) {
      return res.status(409).json({
        error: "USERNAME_TAKEN",
        message: "That username is already taken.",
      });
    }

    return res.status(500).json({
      error: "PROFILE_UPDATE_FAILED",
      message: err.message,
    });
  }
});

router.post("/logout-all", async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }

    await User.findByIdAndUpdate(userId, {
      $inc: { tokenVersion: 1 },
    });

    res.clearCookie("token", {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    res.clearCookie("accessToken");
    res.clearCookie("authToken");
    res.clearCookie("access_token");
    res.clearCookie("jwt");

    return res.json({
      ok: true,
      message: "Logged out from all devices.",
    });
  } catch (err) {
    console.error("Logout all failed:", err);
    return res.status(500).json({
      error: "LOGOUT_ALL_FAILED",
      message: err.message,
    });
  }
});

export default router;

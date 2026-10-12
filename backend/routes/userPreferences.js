import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import UserPreference from "../models/UserPreference.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/me", async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }

    const prefs = await UserPreference.findOne({ userId }).lean();

    return res.json({
      ok: true,
      settings: prefs?.settings || {},
      favoriteChannelIds: prefs?.favoriteChannelIds || [],
      recentChannelIds: prefs?.recentChannelIds || [],
    });
  } catch (err) {
    console.error("GET user preferences failed:", err);

    return res.status(500).json({
      error: "USER_PREFERENCES_LOAD_FAILED",
      message: err.message,
    });
  }
});

router.put("/me", async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }

    const { settings, favoriteChannelIds, recentChannelIds } = req.body || {};

    const update = {};

    if (settings && typeof settings === "object" && !Array.isArray(settings)) {
      update.settings = settings;
    }

    if (Array.isArray(favoriteChannelIds)) {
      update.favoriteChannelIds = favoriteChannelIds
        .filter((id) => typeof id === "string")
        .slice(0, 1000);
    }

    if (Array.isArray(recentChannelIds)) {
      update.recentChannelIds = recentChannelIds
        .filter((id) => typeof id === "string")
        .slice(0, 20);
    }

    const prefs = await UserPreference.findOneAndUpdate(
      { userId },
      { $set: update },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    return res.json({
      ok: true,
      settings: prefs?.settings || {},
      favoriteChannelIds: prefs?.favoriteChannelIds || [],
      recentChannelIds: prefs?.recentChannelIds || [],
    });
  } catch (err) {
    console.error("PUT user preferences failed:", err);

    return res.status(500).json({
      error: "USER_PREFERENCES_SAVE_FAILED",
      message: err.message,
    });
  }
});

export default router;
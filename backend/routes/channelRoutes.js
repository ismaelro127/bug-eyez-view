import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { getUserChannels } from "../services/channelServices.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

const LOCKED_CHANNEL_IDS = new Set([
  "premium_1",
  "premium_2",
]);

router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id.toString();

    const channels = await getUserChannels(
      userId,
      LOCKED_CHANNEL_IDS
    );

    // 🔥 IMPORTANT: wrap response
    res.json({ channels });

  } catch (err) {
  console.error("🔥 CHANNEL ROUTE ERROR FULL STACK:");
  console.error(err);

  logger.error(err, "CHANNEL_ROUTE_FAILED");

  res.status(500).json({
    error: "CHANNEL_FETCH_FAILED",
    message: err?.message,
  });
}
});

export default router;
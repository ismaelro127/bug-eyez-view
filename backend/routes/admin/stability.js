import express from "express";
import { computeChannelStability } from "../../lib/computeChannelStability.js";

const router = express.Router();

router.get("/:channelId", async (req, res) => {
  const score = await computeChannelStability(req.params.channelId);
  res.json({ channelId: req.params.channelId, stability: score });
});

export default router;

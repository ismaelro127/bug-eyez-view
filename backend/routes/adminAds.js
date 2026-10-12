import express from "express";
import adminOnly from "../middleware/adminOnly.js";
import {
  disableAdRewards,
  enableAdRewards,
} from "../services/adKillSwitch.js";

const router = express.Router();

router.post("/ads/disable", adminOnly, async (_req, res) => {
  await disableAdRewards();
  res.json({ ok: true, disabled: true });
});

router.post("/ads/enable", adminOnly, async (_req, res) => {
  await enableAdRewards();
  res.json({ ok: true, disabled: false });
});

export default router;

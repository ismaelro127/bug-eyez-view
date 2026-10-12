import express from "express";
import { persistChannelStability } from "../../services/persistChannelStability.js";

const router = express.Router();

router.post("/", async (_req, res) => {
  await persistChannelStability();
  res.json({ ok: true });
});

export default router;

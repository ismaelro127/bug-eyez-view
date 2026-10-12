import express from "express";
import { getAdminChannelInsights } from "../../services/adminChannelInsights.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  const data = await getAdminChannelInsights();
  res.json(data);
});

export default router;

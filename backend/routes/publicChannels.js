import express from "express";
import fs from "fs";
import path from "path";

const router = express.Router();

const CHANNEL_FILE = path.join(process.cwd(), "legal_verified_channels.json");

router.get("/channels", async (req, res) => {
  try {
    const data = fs.readFileSync(CHANNEL_FILE, "utf-8");
    const channels = JSON.parse(data);
    res.json(channels);
  } catch (err) {
    console.error("Channel load error:", err);
    res.status(500).json({ error: "CHANNEL_LOAD_FAILED" });
  }
});

export default router;
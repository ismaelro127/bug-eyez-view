import express from "express";
import fs from "fs";
import path from "path";

const router = express.Router();
const STATUS_FILE = path.resolve("backend/shared/epgStatus.json");

router.get("/api/epg/status", (req, res) => {
  if (!fs.existsSync(STATUS_FILE)) {
    return res.json({});
  }
  res.json(JSON.parse(fs.readFileSync(STATUS_FILE, "utf-8")));
});

export default router;

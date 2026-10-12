import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  getBugzChannels,
  getEpgList,
  getEpgPrograms
} from "../services/contentService.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

/**
 * Bug Eyez Originals
 */
router.get("/bugz-channels", authMiddleware, async (req, res) => {
  try {
    const channels = await getBugzChannels();
    res.json(channels);
  } catch (err) {
    logger.error({ err }, "BUGZ_ROUTE_FAILED");
    res.status(500).json({ error: "BUGZ_CHANNELS_FAILED" });
  }
});

/**
 * EPG list
 */
router.get("/epg/list", async (req, res) => {
  try {
    const list = await getEpgList();
    res.json(list);
  } catch (err) {
    logger.error({ err }, "EPG_LIST_FAILED");
    res.status(500).json({ error: "EPG_LIST_FAILED" });
  }
});

/**
 * EPG programs
 */
router.get("/epg", async (req, res) => {
  try {
    const programs = await getEpgPrograms();
    res.json(programs);
  } catch (err) {
    logger.error({ err }, "EPG_FETCH_FAILED");
    res.status(500).json({ error: "EPG_FETCH_FAILED" });
  }
});

export default router;
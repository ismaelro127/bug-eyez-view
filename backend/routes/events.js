import express from "express";
import Event from "../models/Event.js";
import { logger } from "../utils/logger.js";
import rateLimit from "express-rate-limit";
import { getRedis } from "../config/redis.js";

const eventLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
});
const router = express.Router();

/* ======================================
   CONFIG
====================================== */

let WRITE_BUFFER = [];
let flushing = false;

const MAX_BUFFER = 2000; // safe for free tier
const FLUSH_INTERVAL = 2000;
const MAX_DURATION = 60 * 60 * 6; // 6 hours max safety cap
const MAX_BUFFER_HARD_LIMIT = 10000; // absolute memory protection
const redis = getRedis();
/* ======================================
   Safe Flush
====================================== */

async function flushBuffer() {
  if (flushing) return;
  if (!WRITE_BUFFER.length) return;

  flushing = true;

  const batch = WRITE_BUFFER.slice();
  WRITE_BUFFER = [];

  try {
    await Event.insertMany(batch, {
      ordered: false,
    });
  } catch (err) {
    logger.error("Batch insert error:", err.message);
    WRITE_BUFFER.unshift(...batch);
  } finally {
    flushing = false;
  }
}

setInterval(() => {
  flushBuffer().catch(() => {});
}, FLUSH_INTERVAL);

/* ======================================
   Safe Event Recorder
====================================== */

function recordEvent(type, payload = {}) {
  if (!type) return;
  if (!payload.channel_id) return;

  const now = new Date();

  const safeEvent = {
    type,
    channel_id: String(payload.channel_id),
    session_id: payload.session_id || null,
    delivery: payload.delivery || null,
    meta: payload.meta || null,
    started_at: payload.started_at || null,
    duration_seconds: sanitizeDuration(payload.duration_seconds),
    minute_bucket: Math.floor(Date.now() / 60000),
    createdAt: now,
    updatedAt: now,
  };

  // store raw event history
  WRITE_BUFFER.push(safeEvent);

  // push to Redis analytics queue
  if (redis && redis.status === "ready") {
    try {
      redis.lpush(
        "channel:events",
        JSON.stringify({
          channel_id: safeEvent.channel_id,
          type: safeEvent.type,
          ts: Date.now(),
        })
      );
    } catch (err) {
      logger.warn({ err }, "Redis event push failed");
    }
  }

  // flush Mongo buffer if needed
  if (WRITE_BUFFER.length >= MAX_BUFFER) {
    flushBuffer().catch(() => {});
  }
}/* ======================================
   Duration Sanitizer
====================================== */

function sanitizeDuration(value) {
  if (typeof value !== "number") return null;
  if (!Number.isFinite(value)) return null;
  if (value < 0) return null;
  if (value > MAX_DURATION) return MAX_DURATION;
  return Number(value.toFixed(3));
}

/* ======================================
   Routes
====================================== */
router.use(eventLimiter);
router.post("/channel-play-started", (req, res) => {
  const { channel_id, session_id, delivery } = req.body || {};

  recordEvent("channel-play-started", {
    channel_id,
    session_id,
    delivery,
    started_at: new Date(),
  });

  res.json({ ok: true });
});

router.post("/channel-play-failed", (req, res) => {
  const { channel_id, session_id, delivery, reason } =
    req.body || {};

  recordEvent("channel-play-failed", {
    channel_id,
    session_id,
    delivery,
    meta: { reason },
  });

  res.json({ ok: true });
});

router.post("/channel-play-stopped", (req, res) => {
  const { channel_id, session_id, duration_seconds } =
    req.body || {};

  recordEvent("channel-play-stopped", {
    channel_id,
    session_id,
    duration_seconds,
  });

  res.json({ ok: true });
});

/* ======================================
   Graceful Shutdown Flush
====================================== */

async function shutdownFlush() {
  try {
    if (WRITE_BUFFER.length) {
      await Event.insertMany(WRITE_BUFFER, { ordered: false });
    }
  } catch (err) {
    logger.error("Shutdown flush error:", err.message);
  }
}

process.on("SIGINT", async () => {
  try {
    await shutdownFlush();
  } finally {
    process.exit(0);
  }
});

process.on("SIGTERM", async () => {
  await shutdownFlush();
  process.exit();
});

export default router;

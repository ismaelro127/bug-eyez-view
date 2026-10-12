import fs from "fs";
import path from "path";
import { logger } from "../utils/logger.js";

const LOG_FILE = path.resolve(
  process.cwd(),
  "backend/data/channel_activity_log.json"
);

const MAX_SAFE_ENTRIES = 10000; // prevent runaway memory

function safeLoadLog() {
  try {
    if (!fs.existsSync(LOG_FILE)) return [];

    const raw = fs.readFileSync(LOG_FILE, "utf8");

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      logger.warn("Channel activity log malformed — resetting");
      return [];
    }

    // Prevent runaway memory if file grows too large
    if (parsed.length > MAX_SAFE_ENTRIES) {
      logger.warn(
        { size: parsed.length },
        "Channel activity log too large — trimming for stats"
      );
      return parsed.slice(-MAX_SAFE_ENTRIES);
    }

    return parsed;
  } catch (err) {
    logger.error({ err }, "Failed to read channel activity log");
    return [];
  }
}

export function getChannelActivityStats() {
  const log = safeLoadLog();

  const byChannel = {};

  for (const entry of log) {
    if (!entry.channelId || !entry.durationMin) continue;

    if (!byChannel[entry.channelId]) {
      byChannel[entry.channelId] = {
        observations: 0,
        totalDuration: 0,
        startHours: {},
        days: {},
        confidenceSum: 0,
      };
    }

    const c = byChannel[entry.channelId];

    c.observations++;
    c.totalDuration += entry.durationMin;
    c.confidenceSum += entry.confidence ?? 0.5;

    c.startHours[entry.startHour] =
      (c.startHours[entry.startHour] || 0) + 1;

    c.days[entry.dayOfWeek] =
      (c.days[entry.dayOfWeek] || 0) + 1;
  }

  const result = {};

  for (const id in byChannel) {
    const c = byChannel[id];

    const mostCommonHour = Object.entries(c.startHours).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0];

    const mostCommonDay = Object.entries(c.days).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0];

    result[id] = {
      channelId: id,
      observations: c.observations,
      avgDurationMin: Math.round(
        c.totalDuration / c.observations
      ),
      mostCommonStartHour: Number(mostCommonHour),
      mostCommonDay: Number(mostCommonDay),
      avgConfidence:
        Math.round((c.confidenceSum / c.observations) * 100) / 100,
    };
  }

  return result;
}
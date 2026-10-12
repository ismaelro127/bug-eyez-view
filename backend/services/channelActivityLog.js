import fs from "fs";
import path from "path";
import { logger } from "../utils/logger.js";

const LOG_FILE = path.resolve(
  process.cwd(),
  "backend/data/channel_activity_log.json"
);

const MAX_LOG_ENTRIES = 10000; // prevent infinite growth

/* ======================================
   Safe File Handling
====================================== */

function ensureLogFile() {
  if (!fs.existsSync(LOG_FILE)) {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.writeFileSync(LOG_FILE, JSON.stringify([], null, 2));
  }
}

function safeReadLog() {
  try {
    ensureLogFile();
    const raw = fs.readFileSync(LOG_FILE, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    logger.error({ err }, "Channel activity log corrupted — resetting");
    fs.writeFileSync(LOG_FILE, JSON.stringify([], null, 2));
    return [];
  }
}

function safeWriteLog(entries) {
  try {
    // prevent infinite growth
    if (entries.length > MAX_LOG_ENTRIES) {
      entries = entries.slice(-Math.floor(MAX_LOG_ENTRIES / 2));
    }

    fs.writeFileSync(LOG_FILE, JSON.stringify(entries, null, 2));
  } catch (err) {
    logger.error({ err }, "Failed writing channel activity log");
  }
}

/* ======================================
   Stats
====================================== */

export function getChannelActivityStats() {
  const log = safeReadLog();

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

/* ======================================
   Record Start
====================================== */

export function recordChannelActivity({
  channelId,
  source,
  detectedTitle,
  confidence = 0.5,
  detectedBy = "scraper",
}) {
  const log = safeReadLog();

  const alreadyOpen = log.find(
    (e) => e.channelId === channelId && !e.endedAt
  );
  if (alreadyOpen) return;

  const now = new Date();

  log.push({
    channelId,
    source,
    detectedTitle,
    confidence,
    detectedBy,
    startedAt: now.toISOString(),
    endedAt: null,
    dayOfWeek: now.getDay(),
    startHour: now.getHours(),
    startMinute: now.getMinutes(),
  });

  safeWriteLog(log);
}

/* ======================================
   Record End
====================================== */

export function endChannelActivity(channelId) {
  const log = safeReadLog();

  const entry = log.find(
    (e) => e.channelId === channelId && !e.endedAt
  );

  if (!entry) return;

  const end = new Date();
  const start = new Date(entry.startedAt);

  entry.endedAt = end.toISOString();
  entry.durationMin = Math.round(
    (end.getTime() - start.getTime()) / 60000
  );

  safeWriteLog(log);
}

export function getOpenChannelActivities() {
  const log = safeReadLog();
  return log.filter((e) => !e.endedAt);
}
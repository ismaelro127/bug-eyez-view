import express from "express";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import schedule from "node-schedule";
import { v4 as uuidv4 } from "uuid";
import { fileURLToPath } from "url";
import { logger } from "../utils/logger.js";

const router = express.Router();

// ESM dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const MAX_RECORDINGS = 10;
const MAX_CONCURRENT_RECORDINGS = 2;
const MAX_DURATION_SECONDS = 60 * 60 * 3;

const RECORDINGS_DIR = path.join(__dirname, "../recordings");
const JOBS_FILE = path.join(__dirname, "../recordings.json");

if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR);
}

// In-memory state
let recordingJobs = [];

if (fs.existsSync(JOBS_FILE)) {
  recordingJobs = JSON.parse(fs.readFileSync(JOBS_FILE));
}

function saveRecordingJobs() {
  fs.writeFileSync(JOBS_FILE, JSON.stringify(recordingJobs, null, 2));
}

function countActiveRecordings() {
  return recordingJobs.filter(j => j.status === "recording").length;
}

function scheduleRecordingJob(job) {
  const startTime = new Date(job.start);
  const endTime = new Date(job.end);
  const durationSec = Math.max(1, Math.floor((endTime - startTime) / 1000));
  const filename = `${job.channelName.replace(/\s+/g, "_")}_${job.id}.mp4`;
  const filepath = path.join(RECORDINGS_DIR, filename);

  schedule.scheduleJob(startTime, () => {
    if (countActiveRecordings() >= MAX_CONCURRENT_RECORDINGS) {
      job.status = "skipped_concurrency_limit";
      saveRecordingJobs();
      logger.warn("Recording skipped due to concurrency limit");
      return;
    }

    logger.info(`📼 Starting recording: ${job.channelName}`);

    job.status = "recording";
    job.filename = filename;
    saveRecordingJobs();

    const ffmpeg = spawn("ffmpeg", [
      "-i", job.streamUrl,
      "-t", durationSec.toString(),
      "-c", "copy",
      filepath
    ]);

    ffmpeg.stderr.on("data", data =>
      logger.info(`[ffmpeg] ${data}`)
    );

    ffmpeg.on("error", err => {
      logger.error({ err }, "FFmpeg spawn failed");
      job.status = "failed";
      saveRecordingJobs();
    });

    ffmpeg.on("close", () => {
      logger.info(`✅ Finished recording: ${job.channelName}`);
      job.status = "completed";
      saveRecordingJobs();
    });
  });
}

// Restore scheduled jobs
recordingJobs.forEach(job => {
  if (job.status === "scheduled") {
    scheduleRecordingJob(job);
  }
});

// Routes

router.post("/api/recordings", (req, res) => {
  try {
    const { channelName, streamUrl, start, end } = req.body;

    if (!channelName || !streamUrl || !start || !end) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (recordingJobs.length >= MAX_RECORDINGS) {
      return res.status(429).json({ error: "MAX_RECORDINGS_REACHED" });
    }

    const startTime = new Date(start);
    const endTime = new Date(end);

    if (isNaN(startTime) || isNaN(endTime)) {
      return res.status(400).json({ error: "INVALID_DATE" });
    }

    if (startTime <= new Date()) {
      return res.status(400).json({ error: "START_MUST_BE_FUTURE" });
    }

    if (endTime <= startTime) {
      return res.status(400).json({ error: "INVALID_TIME_RANGE" });
    }

    const durationSec = Math.floor((endTime - startTime) / 1000);

    if (durationSec > MAX_DURATION_SECONDS) {
      return res.status(400).json({ error: "DURATION_TOO_LONG" });
    }

    const id = uuidv4();

    const job = {
      id,
      channelName,
      streamUrl,
      start,
      end,
      status: "scheduled",
      filename: "",
    };

    recordingJobs.push(job);
    saveRecordingJobs();
    scheduleRecordingJob(job);

    res.json({ success: true, id });

  } catch (err) {
    logger.error({ err }, "Recording creation failed");
    res.status(500).json({ error: "RECORDING_FAILED" });
  }
});

router.get("/api/recordings", (req, res) => {
  res.json(recordingJobs);
});

router.use("/recordings", express.static(RECORDINGS_DIR));

export default router;
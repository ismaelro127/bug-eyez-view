import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { execFile } from "child_process";
import { fileURLToPath } from "url";
import { logger } from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_KEY = process.env.YOUTUBE_API_KEY || process.env.YT_API_KEY;
const MAX_RESULTS = 50;

const SEARCH_QUERIES = [
  "live",
  "24/7",
  "livestream",
  "breaking news",
  "space live",
  "traffic cam",
  "weather live",
  "public radio",
  "independent news",
];

const discovered = new Map();
const verified = [];

async function searchYouTube(query) {
  if (!API_KEY) {
    throw new Error("Missing YOUTUBE_API_KEY or YT_API_KEY in environment.");
  }

  const url =
    `https://www.googleapis.com/youtube/v3/search` +
    `?part=snippet&type=video&eventType=live` +
    `&videoEmbeddable=true` +
    `&maxResults=${MAX_RESULTS}` +
    `&q=${encodeURIComponent(query)}` +
    `&key=${API_KEY}`;

  const res = await fetch(url);
  const json = await res.json().catch(() => null);

  if (!res.ok) {
    logger.warn("YouTube search failed:", {
      query,
      status: res.status,
      error: json?.error,
    });
    return;
  }

  if (!Array.isArray(json?.items)) return;

  for (const item of json.items) {
    const videoId = item?.id?.videoId;

    if (!videoId) continue;

    discovered.set(videoId, {
      youtubeId: videoId,
      title: item?.snippet?.title || "Untitled YouTube Live",
      channelName: item?.snippet?.channelTitle || "Unknown Channel",
    });
  }
}

async function testEmbed(videoId) {
  return new Promise((resolve) => {
    const testScript = path.join(__dirname, "runEmbedTest.js");

    execFile("node", [testScript, videoId], { cwd: __dirname }, (err, stdout) => {
      if (err) {
        resolve(false);
        return;
      }

      resolve(stdout.includes("EMBED_OK"));
    });
  });
}

async function run() {
  logger.info("🔍 Discovering live streams...");

  for (const query of SEARCH_QUERIES) {
    logger.info(`Searching YouTube: ${query}`);
    await searchYouTube(query);
  }

  logger.info(`Found ${discovered.size} candidates`);

  for (const item of discovered.values()) {
    const ok = await testEmbed(item.youtubeId);

    if (ok) {
      verified.push({
        id: `yt_${item.youtubeId}`,
        youtubeId: item.youtubeId,
        name: item.title,
        provider: item.channelName,
        delivery: "youtube",
        genre: "News",
        category: "Live",
        trusted: true,
        locked: true,
        unlockCost: 25,
        hasEPG: false,
        status: "live",
      });

      logger.info("✅ EMBEDDABLE:", item.title);
    } else {
      logger.info("❌ BLOCKED:", item.title);
    }
  }

  const outputPath = path.join(__dirname, "results.json");

  fs.writeFileSync(outputPath, JSON.stringify(verified, null, 2), "utf-8");

  logger.info(`🎉 Saved ${verified.length} embeddable streams`);
  logger.info(`Output: ${outputPath}`);
}

run().catch((err) => {
  logger.error("YouTube discovery script failed:", err);
  process.exit(1);
});
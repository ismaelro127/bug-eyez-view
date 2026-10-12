import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { recordChannelPattern } from "../services/recordChannelPattern.js";
import { logger } from "../utils/logger.js";

import {
  recordChannelActivity,
  endChannelActivity,
  getOpenChannelActivities,
} from "../services/channelActivityLog.js";

/* --------------------------------------------------
   PATHS / ENV
-------------------------------------------------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_KEY = process.env.YOUTUBE_API_KEY;
if (!API_KEY) {
  logger.error("Missing YOUTUBE_API_KEY");
  process.exit(1);
}

const LEGAL_FILE = path.join(
  __dirname,
  "../../frontend/public/legal_verified_channels.json"
);

logger.info(`Script directory: ${__dirname}`);
logger.info(`Legal channels file: ${LEGAL_FILE}`);

const sessionHash = crypto.randomUUID();

const YOUTUBE_CHANNEL_LOCKED = true;
const YOUTUBE_UNLOCK_COST = 25;
/* --------------------------------------------------
   SEARCH CONFIG
-------------------------------------------------- */
const SEARCH_QUERIES = [
  "live news",
  "live radio",
  "live music",
  "24/7 live",
  "live space",
  "live camera",
  "live nature",
  "live city",
];

/* --------------------------------------------------
   🔍 Search LIVE videos
-------------------------------------------------- */
async function searchLive(query) {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");

  url.search = new URLSearchParams({
    key: API_KEY,
    part: "snippet",
    q: query,
    type: "video",
    eventType: "live",
    maxResults: "25",
    safeSearch: "none",
  });

  const res = await fetch(url);
const data = await res.json().catch(() => null);

if (!res.ok) {
  logger.error(
    {
      query,
      status: res.status,
      error: data,
    },
    "❌ YouTube search request failed"
  );

  return [];
}

logger.info(
  `Search "${query}" returned ${Array.isArray(data?.items) ? data.items.length : 0} results`
);

return Array.isArray(data?.items) ? data.items : [];
}

/* --------------------------------------------------
   📦 Fetch details
-------------------------------------------------- */
/* --------------------------------------------------
   📦 Fetch details in batches of 50
-------------------------------------------------- */
async function getVideoDetails(videoIds) {
  if (!Array.isArray(videoIds) || videoIds.length === 0) return [];

  const allItems = [];

  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);

    const url = new URL("https://www.googleapis.com/youtube/v3/videos");

    url.search = new URLSearchParams({
      key: API_KEY,
      part: "snippet,status,liveStreamingDetails",
      id: batch.join(","),
    }).toString();

    try {
      const res = await fetch(url.toString());
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        logger.error(
          {
            status: res.status,
            error: data,
            batchSize: batch.length,
          },
          "❌ YouTube video details request failed"
        );

        continue;
      }

      if (Array.isArray(data?.items)) {
        allItems.push(...data.items);
      }
    } catch (err) {
      logger.error(
        {
          err: {
            message: err?.message,
            stack: err?.stack,
          },
          batchSize: batch.length,
        },
        "❌ Failed fetching YouTube video details"
      );
    }
  }

  return allItems;
}

/* --------------------------------------------------
   🚀 MAIN MERGE LOGIC
-------------------------------------------------- */
async function run() {
  /* 1️⃣ Load existing legal channels */
  let legalChannels = [];

if (!fs.existsSync(LEGAL_FILE)) {
  logger.warn("⚠️ legal_verified_channels.json NOT FOUND at:");
  logger.warn(LEGAL_FILE);
} else {
  const raw = fs.readFileSync(LEGAL_FILE, "utf8");
  legalChannels = JSON.parse(raw);

  logger.info(`Loaded ${legalChannels.length} existing legal channels`);

}


  // Build lookup maps
  const byYoutubeId = new Map();
const byId = new Map();

for (const ch of legalChannels) {
  if (ch.delivery === "youtube") {
    ch.locked = true;
    ch.unlockCost = ch.unlockCost ?? YOUTUBE_UNLOCK_COST;
  }

  if (ch.youtubeId) byYoutubeId.set(ch.youtubeId, ch);
  if (ch.id) byId.set(ch.id, ch);
}

  /* 2️⃣ Discover live videos */
  const discoveredIds = new Set();
  const currentlyLiveIds = new Set();
  const currentlyLiveVideoIds = new Set();

  for (const q of SEARCH_QUERIES) {
    const results = await searchLive(q);
    for (const item of results) {
      if (item?.id?.videoId) {
        discoveredIds.add(item.id.videoId);
      }
    }
  }

  if (!discoveredIds.size) {
    logger.info("⚠️ No live videos discovered");
    return;
  }

  /* 3️⃣ Fetch details */
  const details = await getVideoDetails([...discoveredIds]);

if (!details.length) {
  logger.warn(
    "⚠️ YouTube search found videos, but details returned empty. Skipping cleanup to avoid removing live channels by mistake."
  );
  return;
}

  let added = 0;
  let skipped = 0;

  for (const video of details) {
    if (!video.status?.embeddable) continue;

    const isLive =
      video.liveStreamingDetails &&
      !video.liveStreamingDetails.actualEndTime;

    if (!isLive) continue;

   const channelId = `yt_${video.id}`;
const nowIso = new Date().toISOString();

currentlyLiveIds.add(channelId);
currentlyLiveVideoIds.add(video.id);

recordChannelActivity({
  channelId,
  source: "youtube",
  detectedTitle: video.snippet.title,
  confidence: 0.65,
  detectedBy: "scraper",
});

    // Deduplicate
    if (byYoutubeId.has(video.id)) {
  const existing = byYoutubeId.get(video.id);

  Object.assign(existing, {
    name: video.snippet.title,
    logo: video.snippet.thumbnails?.high?.url || existing.logo,

    locked: true,
    unlockCost: existing.unlockCost ?? YOUTUBE_UNLOCK_COST,

    isLive: true,
    offline: false,
    unlockDisabled: false,
    status: "live",

    lastCheckedAt: nowIso,
    lastLiveAt: nowIso,
    lastVerified: nowIso,
  });

  skipped++;
  continue;
}

    const channel = {
  id: channelId,
  name: video.snippet.title,
  logo: video.snippet.thumbnails?.high?.url,

  category: "YouTube Live",
  group: "web_live",

  delivery: "youtube",
  youtubeId: video.id,

  embed: {
    url: `https://www.youtube.com/embed/${video.id}?autoplay=1&mute=1`,
    provider: "YouTube",
    trusted: true,
  },

  officialLinks: {
    youtube: `https://www.youtube.com/watch?v=${video.id}`,
  },

  hasEPG: false,
  aiCandidate: true,
  confidence: 0.65,
  stable: false,

  source: "youtube_auto",
  lastVerified: nowIso,
lastCheckedAt: nowIso,
lastLiveAt: nowIso,

isLive: true,
offline: false,
unlockDisabled: false,
status: "live",

  // 🔒 Credit unlock system
  locked: YOUTUBE_CHANNEL_LOCKED,
  unlockCost: YOUTUBE_UNLOCK_COST,
};

    legalChannels.push(channel);
    byYoutubeId.set(video.id, channel);
    byId.set(channel.id, channel);
    added++;
  await recordChannelPattern({
  channelId: channel.id,
  channelName: channel.name,
  programTitle: channel.name,
  startTime: new Date().toISOString(),
  endTime: null,
  source: "youtube_auto",
  deliveryType: "youtube",
  programType: "live",
  region: video.snippet?.channelTitle || "YouTube",
  endedReason: null,
});
  }

  

const previousYoutubeIds = new Set(
  legalChannels
    .filter(ch => ch.source === "youtube_auto" && ch.youtubeId)
    .map(ch => ch.youtubeId)
);


  // 🔴 Close sessions that are no longer live
const openSessions = getOpenChannelActivities();

for (const session of openSessions) {
  if (
    session.source === "youtube" &&
    !currentlyLiveIds.has(session.channelId)
  ) {
    endChannelActivity(session.channelId);
  }
}

const verifiedRunHadLiveResults = currentlyLiveVideoIds.size > 0;

const offlineIds = verifiedRunHadLiveResults
  ? [...previousYoutubeIds].filter(
      (id) => !currentlyLiveVideoIds.has(id)
    )
  : [];

if (offlineIds.length) {
  const offlineSet = new Set(offlineIds);

  // Optional: record offline patterns before removal
  for (const youtubeId of offlineIds) {
    const channelId = `yt_${youtubeId}`;
    const existing = byYoutubeId.get(youtubeId);

    await recordChannelPattern({
      channelId,
      channelName: existing?.name || channelId,
      programTitle: "YouTube stream offline",
      startTime: null,
      endTime: new Date().toISOString(),
      source: "youtube_auto",
      deliveryType: "youtube",
      programType: "live",
      region: "YouTube",
      endedReason: "removed_from_latest_scrape",
    });
  }

  // Remove offline auto-discovered YouTube channels from UI registry
  legalChannels = legalChannels.filter((ch) => {
    if (ch.source !== "youtube_auto") return true;
    if (ch.delivery !== "youtube") return true;
    if (!ch.youtubeId) return true;

    return !offlineSet.has(ch.youtubeId);
  });

logger.info(`Removed ${offlineIds.length} offline YouTube channels`);
}

  /* 4️⃣ Save merged file */
fs.writeFileSync(LEGAL_FILE, JSON.stringify(legalChannels, null, 2));


  logger.info(`Saved merged channels to: ${LEGAL_FILE}`);
logger.info("Merge complete");
logger.info(`Added: ${added}`);
logger.info(`Skipped duplicates: ${skipped}`);
logger.info(`Total channels: ${legalChannels.length}`);
}

run().catch((err) => {
  console.error("Script failed FULL:", err);

  logger.error(
    {
      err: {
        message: err?.message,
        stack: err?.stack,
        name: err?.name,
        code: err?.code,
      },
    },
    "Script failed"
  );
});
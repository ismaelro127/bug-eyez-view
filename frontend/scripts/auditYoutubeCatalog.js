const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const registryPath = path.join(
  root,
  "public",
  "legal_verified_channels.json"
);

const channels = JSON.parse(
  fs.readFileSync(registryPath, "utf8")
);

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isYoutube(channel) {
  return (
    channel.delivery === "youtube" ||
    channel.type === "youtube" ||
    channel.category === "YouTube Live" ||
    Boolean(channel.youtubeId)
  );
}

function getYoutubeId(channel) {
  if (channel.youtubeId) {
    return String(channel.youtubeId).trim();
  }

  if (
    typeof channel.id === "string" &&
    channel.id.startsWith("yt_")
  ) {
    return channel.id.slice(3);
  }

  return null;
}

function isOffline(channel) {
  return (
    channel.offline === true ||
    channel.isLive === false ||
    channel.live === false ||
    channel.unlockDisabled === true ||
    normalize(channel.status) === "offline" ||
    normalize(channel.live_status) === "offline"
  );
}

function classifyTitle(channel) {
  const text = normalize(channel.name);

  const persistentPatterns = [
    /24\/7/,
    /24-7/,
    /live radio/,
    /live cam/,
    /live camera/,
    /webcam/,
    /earthcam/,
    /radio/,
    /live stream/,
    /livestream/,
    /always live/,
  ];

  const oneTimePatterns = [
    /\bjune\b/,
    /\bjuly\b/,
    /\baugust\b/,
    /\bseptember\b/,
    /\boctober\b/,
    /\bnovember\b/,
    /\bdecember\b/,
    /\bjanuary\b/,
    /\bfebruary\b/,
    /\bmarch\b/,
    /\bapril\b/,
    /\bmay\b/,
    /\bprimary\b/,
    /\belection rally\b/,
    /\bpress meet\b/,
    /\bbriefing\b/,
    /\bhearing\b/,
    /\btestifies\b/,
    /\bbreaking\b/,
    /\blatest news\b/,
    /\bwar latest\b/,
    /\blaunches\b/,
    /\blifts off\b/,
  ];

  const likelyPersistent =
    persistentPatterns.some((pattern) =>
      pattern.test(text)
    );

  const likelyOneTime =
    oneTimePatterns.some((pattern) =>
      pattern.test(text)
    );

  return {
    likelyPersistent,
    likelyOneTime,
  };
}

const youtubeChannels =
  channels.filter(isYoutube);

const byVideoId = new Map();
const byTitle = new Map();

const offline = [];
const staleCandidates = [];
const persistent = [];
const unknown = [];

for (const channel of youtubeChannels) {
  const videoId = getYoutubeId(channel);

  if (videoId) {
    if (!byVideoId.has(videoId)) {
      byVideoId.set(videoId, []);
    }

    byVideoId.get(videoId).push(channel);
  }

  const titleKey = normalize(channel.name);

  if (titleKey) {
    if (!byTitle.has(titleKey)) {
      byTitle.set(titleKey, []);
    }

    byTitle.get(titleKey).push(channel);
  }

  if (isOffline(channel)) {
    offline.push(channel);
  }

  const classification =
    classifyTitle(channel);

  if (
    classification.likelyOneTime &&
    !classification.likelyPersistent
  ) {
    staleCandidates.push(channel);
  } else if (
    classification.likelyPersistent
  ) {
    persistent.push(channel);
  } else {
    unknown.push(channel);
  }
}

const duplicateIds = Array.from(
  byVideoId.entries()
).filter(([, list]) => list.length > 1);

const duplicateTitles = Array.from(
  byTitle.entries()
).filter(([, list]) => list.length > 1);

console.log("");
console.log("=================================");
console.log(" YOUTUBE CATALOG AUDIT");
console.log("=================================");
console.log("");

console.log(
  `Total channels: ${channels.length}`
);

console.log(
  `YouTube channels: ${youtubeChannels.length}`
);

console.log(
  `Duplicate video IDs: ${duplicateIds.length}`
);

console.log(
  `Duplicate titles: ${duplicateTitles.length}`
);

console.log(
  `Offline/dead flagged: ${offline.length}`
);

console.log(
  `Likely stale one-time events: ${staleCandidates.length}`
);

console.log(
  `Likely persistent streams: ${persistent.length}`
);

console.log(
  `Unknown/manual review: ${unknown.length}`
);

console.log("");
console.log("=== DUPLICATE VIDEO IDS ===");

for (const [videoId, list] of duplicateIds) {
  console.log("");
  console.log(`VIDEO ID: ${videoId}`);

  for (const channel of list) {
    console.log(
      `  ${channel.id} — ${channel.name}`
    );
  }
}

console.log("");
console.log("=== DUPLICATE TITLES ===");

for (const [title, list] of duplicateTitles) {
  console.log("");
  console.log(`TITLE: ${title}`);

  for (const channel of list) {
    console.log(
      `  ${channel.id} — ${getYoutubeId(channel) || "(no video id)"}`
    );
  }
}

console.log("");
console.log("=== OFFLINE / DEAD FLAGGED ===");

for (const channel of offline) {
  console.log(
    `${channel.id} — ${channel.name}`
  );
}

console.log("");
console.log("=== LIKELY STALE ONE-TIME EVENTS ===");

for (const channel of staleCandidates) {
  console.log(
    `${channel.id} — ${channel.name}`
  );
}

console.log("");
console.log("=== LIKELY PERSISTENT STREAMS ===");

for (const channel of persistent) {
  console.log(
    `${channel.id} — ${channel.name}`
  );
}

console.log("");
console.log("=== UNKNOWN / MANUAL REVIEW ===");

for (const channel of unknown) {
  console.log(
    `${channel.id} — ${channel.name}`
  );
}
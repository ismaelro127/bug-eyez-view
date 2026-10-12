const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const registryPath = path.join(
  root,
  "public",
  "legal_verified_channels.json"
);

const epgDir = path.join(
  root,
  "public",
  "epg"
);

const channels = JSON.parse(
  fs.readFileSync(registryPath, "utf8")
);

const channelIds = new Set(
  channels.map((channel) => String(channel.id))
);

const NON_CHANNEL_EPG_FILES = new Set([
  "master_epg.json",
]);

const epgFiles = fs
  .readdirSync(epgDir)
  .filter((name) => {
    const lower = name.toLowerCase();

    if (!lower.endsWith(".json")) {
      return false;
    }

    if (NON_CHANNEL_EPG_FILES.has(lower)) {
      return false;
    }

    if (lower.endsWith("_metadata.json")) {
      return false;
    }

    return true;
  });
  
console.log("");
console.log(`Registry channels: ${channels.length}`);
console.log(`EPG files: ${epgFiles.length}`);
console.log(`Orphan EPG files: ${orphanFiles.length}`);
console.log("");

for (const file of orphanFiles) {
  const id = file.replace(/\.json$/i, "");

  let entries = [];
  let status = "valid";

  try {
    const raw = fs.readFileSync(
      path.join(epgDir, file),
      "utf8"
    );

    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      entries = parsed;
    } else {
      status = "invalid-shape";
    }
  } catch (error) {
    status = "invalid-json";
  }

  const newestStop = entries
    .map((entry) => entry.stop_utc)
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
    .filter((value) => !Number.isNaN(value))
    .sort((a, b) => b - a)[0];

  const newestDate = newestStop
    ? new Date(newestStop).toISOString()
    : "none";

  const possibleMatches = channels
    .filter((channel) => {
      const candidate = String(channel.id)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

      const orphan = id
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

      return (
        candidate.includes(orphan) ||
        orphan.includes(candidate)
      );
    })
    .map((channel) => ({
      id: channel.id,
      name: channel.name,
    }));

  console.log(`FILE: ${file}`);
  console.log(`  Entries: ${entries.length}`);
  console.log(`  Status: ${status}`);
  console.log(`  Newest stop: ${newestDate}`);

  if (possibleMatches.length) {
    console.log("  Possible registry matches:");

    for (const match of possibleMatches) {
      console.log(
        `    - ${match.id} — ${match.name}`
      );
    }
  } else {
    console.log("  Possible registry matches: none");
  }

  console.log("");
}
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

const epgFiles = fs.existsSync(epgDir)
  ? new Set(
      fs
        .readdirSync(epgDir)
        .filter((name) =>
          name.toLowerCase().endsWith(".json")
        )
    )
  : new Set();

const explicitTrueMissing = [];
const implicitMissing = [];
const existing = [];
const skipped = [];

for (const channel of channels) {
  const id = channel.id;

  const fileName = `${id}.json`;
  const fileExists = epgFiles.has(fileName);

  const type = String(
    channel.type ||
      channel.delivery ||
      "hls"
  ).toLowerCase();

  const isYoutube =
    channel.delivery === "youtube" ||
    type === "youtube";

  if (channel.hasEPG === false) {
    skipped.push({
      id,
      reason: "hasEPG=false",
    });

    continue;
  }

  if (
    type === "rotation" ||
    type === "government_live"
  ) {
    skipped.push({
      id,
      reason: type,
    });

    continue;
  }

  if (
    isYoutube &&
    channel.hasEPG !== true
  ) {
    skipped.push({
      id,
      reason: "youtube-no-epg",
    });

    continue;
  }

  if (fileExists) {
    existing.push(id);
    continue;
  }

  if (channel.hasEPG === true) {
    explicitTrueMissing.push(id);
  } else {
    implicitMissing.push(id);
  }
}

console.log("");
console.log(
  `Channels: ${channels.length}`
);

console.log(
  `EPG files found: ${epgFiles.size}`
);

console.log(
  `Channels with EPG files: ${existing.length}`
);

console.log(
  `Skipped intentionally: ${skipped.length}`
);

console.log("");
console.log(
  "=== hasEPG:true BUT FILE MISSING ==="
);

for (const id of explicitTrueMissing) {
  console.log(id);
}

console.log("");
console.log(
  "=== hasEPG UNSPECIFIED + FILE MISSING ==="
);

for (const id of implicitMissing) {
  console.log(id);
}

console.log("");
console.log(
  `Explicit true missing: ${explicitTrueMissing.length}`
);

console.log(
  `Implicit missing: ${implicitMissing.length}`
);
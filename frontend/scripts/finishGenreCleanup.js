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

const GENRE_OVERRIDES = {
  // NEWS
  "yt_5Q3OcaEajgM": "News",
  "yt_41nRb3BZDFw": "News",
  "yt_QB_K7NK4tCc": "News",
  "yt_x5K7jOO0XRM": "News",
  "yt_9G55mAqrx7E": "News",
  "yt_dCynWmcz5lw": "News",
  "yt_u9h_Eb6LJqs": "News",

  // MUSIC / RELAXATION / AMBIENCE
  "yt_nQbvT0QzHC8": "Music",
  "yt_OVMsbS-sHfQ": "Music",
  "yt_dnpRUk2be84": "Music",
  "yt_HnIjDcVCNW4": "Music",
  "yt_TaBX3DdGOxc": "Music",
  "yt_10YvqAmK_qs": "Music",
  "yt_mKCieTImjvU": "Music",

  // LIVE CAMS / LIVE VIEWS
  "yt_YWs0HMRVCBY": "Live Cams",
  "yt_fkzKj0f5TcM": "Live Cams",
  "yt_lat2B6EQgpI": "Live Cams",
  "yt_TODL72mveDs": "Live Cams",
  "yt_fO9e9jnhYK8": "Live Cams",
  "yt_OKQEMp2555A": "Live Cams",
  "yt_AiNCbGzabVo": "Live Cams",
  "yt_HeIU8bUA46I": "Live Cams",
  "yt_nslC27nST-Y": "Live Cams",
  "yt_WKGK_hYnlGE": "Live Cams",
  "yt_YC8tjHPHdu4": "Live Cams",
  "yt_Aea4taIIVPE": "Live Cams",
  "yt_9h42Y9gHqnI": "Live Cams",
  "yt_P5WnSGXJpkM": "Live Cams",
  "yt_F_bENs4GV24": "Live Cams",
  "yt_L6wO1-U2RTY": "Live Cams",
  "yt_Thtj8Ht7Z_c": "Live Cams",
  "yt_tm3fMnPT6d8": "Live Cams",

  // DOCUMENTARY / NATURE
  "yt_8kEzFZvtLzM": "Documentary",
  "yt_4BrvMGznLTo": "Documentary",
  "yt_VABzf7Ig4l4": "Documentary",
  "yt__BMi3usEwi8": "Documentary",
  "yt_wIgRlQ4YzV0": "Documentary",
  "yt_9Rp7Ddxzajs": "Documentary",
  "yt_2_ovWpVE9es": "Documentary",
  "yt_vR7rWIs4wbc": "Documentary",

  // CULTURE / TRAVEL
  "yt_TZikBxNaaQk": "Culture",

  // ENTERTAINMENT / TV
  "yt_Zp3cuJO0IG8": "Movies",
  "yt_OVDMvzyJ0bQ": "Movies",

  // GAMING / ENTERTAINMENT — closest current tab is Movies
  "yt_s4IeBiZeV2w": "Movies"
};

const timestamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-");

const backupPath =
  `${registryPath}.final-genre-backup-${timestamp}`;

fs.copyFileSync(
  registryPath,
  backupPath
);

let changed = 0;
const missingIds = [];

for (const [id, genre] of Object.entries(GENRE_OVERRIDES)) {
  const channel = channels.find(
    (item) => item.id === id
  );

  if (!channel) {
    missingIds.push(id);
    continue;
  }

  channel.genre = genre;
  changed += 1;
}

fs.writeFileSync(
  registryPath,
  `${JSON.stringify(channels, null, 2)}\n`,
  "utf8"
);

const stillUnclassified = channels.filter((channel) => {
  const genre = String(channel.genre || "").trim();

  return !genre;
});

console.log("");
console.log("=================================");
console.log(" FINAL GENRE CLEANUP");
console.log("=================================");
console.log("");

console.log(`Backup: ${backupPath}`);
console.log(`Assignments applied: ${changed}`);
console.log(`Missing IDs: ${missingIds.length}`);
console.log(`Still without genre: ${stillUnclassified.length}`);

if (missingIds.length) {
  console.log("");
  console.log("=== IDS NOT FOUND ===");

  for (const id of missingIds) {
    console.log(id);
  }
}

if (stillUnclassified.length) {
  console.log("");
  console.log("=== STILL WITHOUT GENRE ===");

  for (const channel of stillUnclassified) {
    console.log(
      `${channel.id} — ${channel.name}`
    );
  }
}
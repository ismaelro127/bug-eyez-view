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

/*
 * Manual overrides take priority over every rule.
 * Genre is the user-facing tab.
 * Category can remain more specific.
 */
const MANUAL = {
  // ----- MANUAL NEWS CHANNELS -----
  al_jazeera_english: "News",
  scripps_news: "News",
  gb_news: "News",
  livenow_fox: "News",
  africanews_english: "News",
  cgtn: "News",
  cgtn_espanol: "News",
  dw_en: "News",
  dw_es: "News",
  euronews_english: "News",
  france24_en: "News",
  france24_es: "News",
  cna_news: "News",
  newsmax: "News",
  abc_news_au: "News",
  abs_cbn_news: "News",
  trt_world: "News",
  ndtv_24x7: "News",

  // ----- GOVERNMENT -----
  un_web_tv: "Government",
  us_congress_live: "Government",
  public_affairs_rotation: "Government",

  // ----- PUBLIC TV -----
  pbs_create: "Public TV",
  pbs_mpt_wmpt: "Public TV",

  // ----- KIDS -----
  pbs_kids: "Kids",

  // ----- EDUCATION -----
  nasa_tv: "Education",

  // ----- DOCUMENTARY -----
  cgtn_documentary: "Documentary",

  // ----- CULTURE / INTERNATIONAL -----
  arirang_tv: "Culture",
  arirang_tv_un: "Culture",
  nhk_world_japan: "Culture",
  kbs_world: "Culture",
  rtp_africa: "Culture",
  rtp_internacional: "Culture",
};

function textFor(channel) {
  return [
    channel.name,
    channel.category,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function inferGenre(channel) {
  const text = textFor(channel);

  /*
   * Order matters.
   *
   * Specific content types come BEFORE generic words
   * such as "music", "live", and "radio".
   */

  // KIDS / ANIMATION
  if (
    /disneykids|disneychannel|disney channel|big city greens|gravity falls|lilo\s*&?\s*stitch|stuck in the middle|tom and jerry|total drama|alan becker|sheriff labrador/.test(
      text
    )
  ) {
    return "Kids";
  }

  // CRIME
  if (
    /true crime|dateline|killer.?s mistake|crime cases|crime documentary/.test(
      text
    )
  ) {
    return "Crime";
  }

  // WEATHER
  if (
    /tornado threat|weather live|weather alert|hurricane|storm warning|rain alert|imd alert|heatwave/.test(
      text
    )
  ) {
    return "Weather";
  }

  // GOVERNMENT — only clearly governmental proceedings.
  if (
    /white house briefing|senate hearing|congressional hearing|congress hearing|house hearing|public affairs|senate.*testif|congress.*live/.test(
      text
    )
  ) {
    return "Government";
  }

  // NEWS
  if (
    /\bnews\b|breaking|live updates|press meet|election rally|war latest|iran war|politics live|dharna live|cabinet list|party broken|primary.*rubio/.test(
      text
    )
  ) {
    return "News";
  }

  /*
   * LIVE CAMS
   *
   * This is deliberately before Music/Documentary because
   * many webcams mention background music, wildlife, etc.
   */
  if (
    /\blive cam\b|\blive camera\b|\bwebcam\b|earthcam|street cam|city camera|city cam|beach cam|airport live|airport.*24\/7|market.*camera|nest cam|feederwatch cam|reef camera|boardwalk live|harbour.*24\/7|street view|crossing.*live|rolling cam|world live.*earthtv|cam[123]\b/.test(
      text
    )
  ) {
    return "Live Cams";
  }

  // LIVE ANIMAL/NATURE CAMS
  if (
    /safari cam|eagle live nest|owl nest|bird feeder|cat sanctuary.*24\/7|wildlife cameras|live wildlife camera/.test(
      text
    )
  ) {
    return "Live Cams";
  }

  // EDUCATION / SPACE SCIENCE
  if (
    /official nasa stream|international space station.*official|nasa live stream of earth|journey through the solar system|naked science|space facts|solar radio signals|space coast live|launch pad live/.test(
      text
    )
  ) {
    return "Education";
  }

  // DOCUMENTARY / NATURE PROGRAMMING
  if (
    /documentar|bbc earth|love nature|ultimate nature docs|ww2 in colour|wildlife showdown|wildlife.*24\/7|wild families|universe documentary|space documentary|cosmic journey|cosmic vistas/.test(
      text
    )
  ) {
    return "Documentary";
  }

  // MUSIC
  if (
    /\bradio\b|music radio|pop hits|pop playlist|rock classics|\brock 90s\b|r&b|hip hop|deep house|dance radio|oldies|smooth jazz|bossa nova|ambient music|relaxing music|spotify pop|top hits|country radio|gangsta rap|indie folk|music everyday|billboard hot 100|lofi/.test(
      text
    )
  ) {
    return "Music";
  }

  // MOVIES / FILM
  if (
    /\bmovie\b|\bmovies\b|\bfilm channel\b|\bcinema\b/.test(
      text
    )
  ) {
    return "Movies";
  }

  // SPORTS
  if (
    /\bsports\b|\bnfl\b|\bnba\b|\bmlb\b|\bnhl\b|\bsoccer\b|\bfootball\b|\bbasketball\b|\bbaseball\b|\btennis\b|\bgolf\b|\bboxing\b|\bufc\b/.test(
      text
    )
  ) {
    return "Sports";
  }

  return null;
}

const timestamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-");

const backupPath =
  `${registryPath}.genre-backup-${timestamp}`;

fs.copyFileSync(registryPath, backupPath);

let manualCount = 0;
let inferredCount = 0;
let existingCount = 0;

const unresolved = [];

for (const channel of channels) {
  /*
   * Preserve existing meaningful genres such as:
   * Crime, Cooking, Weather, Education, Government, etc.
   */
  if (
    typeof channel.genre === "string" &&
    channel.genre.trim()
  ) {
    existingCount += 1;
    continue;
  }

  const manualGenre = MANUAL[channel.id];

  if (manualGenre) {
    channel.genre = manualGenre;
    manualCount += 1;
    continue;
  }

  const inferred = inferGenre(channel);

  if (inferred) {
    channel.genre = inferred;
    inferredCount += 1;
    continue;
  }

  unresolved.push({
    id: channel.id,
    name: channel.name,
    category: channel.category,
  });
}

fs.writeFileSync(
  registryPath,
  `${JSON.stringify(channels, null, 2)}\n`,
  "utf8"
);

console.log("");
console.log("=================================");
console.log(" GENRE CLEANUP COMPLETE");
console.log("=================================");
console.log("");

console.log(`Backup: ${backupPath}`);
console.log(`Channels: ${channels.length}`);
console.log(`Existing genres preserved: ${existingCount}`);
console.log(`Manual assignments: ${manualCount}`);
console.log(`Safe inferred assignments: ${inferredCount}`);
console.log(`Still unresolved: ${unresolved.length}`);

console.log("");
console.log("=== STILL UNRESOLVED ===");

for (const item of unresolved) {
  console.log("");
  console.log(item.id);
  console.log(`  ${item.name}`);
  console.log(`  category: ${item.category || "(none)"}`);
}
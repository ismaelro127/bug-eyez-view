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

const APP_GENRES = new Set([
  "News",
  "Government",
  "Public TV",
  "Education",
  "Culture",
  "Sports",
  "Movies",
  "Kids",
  "Music",
  "Documentary",

  // Existing Bug Eyez/custom classifications.
  "Crime",
  "Cooking",
  "Weather",
]);

const GENERIC_VALUES = new Set([
  "",
  "live",
  "youtube live",
  "web_live",
  "general",
  "unknown",
]);

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function inferGenre(channel) {
  const text = [
    channel.name,
    channel.category,
    channel.genre,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  /*
   * GOVERNMENT
   */
  if (
    /\bcongress\b/.test(text) ||
    /\bsenate\b/.test(text) ||
    /\bhouse of representatives\b/.test(text) ||
    /\bparliament\b/.test(text) ||
    /\bwhite house\b/.test(text) ||
    /\bgovernment\b/.test(text) ||
    /\bpublic affairs\b/.test(text) ||
    /\bhearing\b/.test(text)
  ) {
    return {
      genre: "Government",
      confidence: "high",
    };
  }

  /*
   * KIDS
   */
  if (
    /\bkids?\b/.test(text) ||
    /\bdisney\b/.test(text) ||
    /\bcartoon\b/.test(text) ||
    /\banimation\b/.test(text) ||
    /\bnickelodeon\b/.test(text) ||
    /\bpreschool\b/.test(text)
  ) {
    return {
      genre: "Kids",
      confidence: "high",
    };
  }

  /*
   * MUSIC
   */
  if (
    /\bradio\b/.test(text) ||
    /\bmusic\b/.test(text) ||
    /\bpop hits?\b/.test(text) ||
    /\brock\b/.test(text) ||
    /\br&b\b/.test(text) ||
    /\bhip hop\b/.test(text) ||
    /\bdeep house\b/.test(text) ||
    /\bdance\b/.test(text) ||
    /\boldies\b/.test(text) ||
    /\bplaylist\b/.test(text) ||
    /\bsongs?\b/.test(text)
  ) {
    return {
      genre: "Music",
      confidence: "high",
    };
  }

  /*
   * DOCUMENTARY / NATURE
   */
  if (
    /\bdocumentar/.test(text) ||
    /\bwildlife\b/.test(text) ||
    /\bnature\b/.test(text) ||
    /\bbbc earth\b/.test(text) ||
    /\bforest\b/.test(text) ||
    /\beagle\b/.test(text) ||
    /\banimal\b/.test(text)
  ) {
    return {
      genre: "Documentary",
      confidence: "high",
    };
  }

  /*
   * SPORTS
   */
  if (
    /\bsports?\b/.test(text) ||
    /\bfootball\b/.test(text) ||
    /\bsoccer\b/.test(text) ||
    /\bbasketball\b/.test(text) ||
    /\bbaseball\b/.test(text) ||
    /\btennis\b/.test(text) ||
    /\bgolf\b/.test(text) ||
    /\bboxing\b/.test(text) ||
    /\bufc\b/.test(text) ||
    /\bnfl\b/.test(text) ||
    /\bnba\b/.test(text) ||
    /\bmlb\b/.test(text) ||
    /\bnhl\b/.test(text)
  ) {
    return {
      genre: "Sports",
      confidence: "high",
    };
  }

  /*
   * MOVIES
   */
  if (
    /\bmovies?\b/.test(text) ||
    /\bfilms?\b/.test(text) ||
    /\bcinema\b/.test(text) ||
    /\bmovie channel\b/.test(text)
  ) {
    return {
      genre: "Movies",
      confidence: "high",
    };
  }

  /*
   * EDUCATION
   */
  if (
    /\beducation\b/.test(text) ||
    /\blearning\b/.test(text) ||
    /\bscience\b/.test(text) ||
    /\bnasa\b/.test(text) ||
    /\buniversity\b/.test(text) ||
    /\bschool\b/.test(text)
  ) {
    return {
      genre: "Education",
      confidence: "medium",
    };
  }

  /*
   * PUBLIC TV
   */
  if (
    /\bpbs\b/.test(text) ||
    /\bpublic television\b/.test(text) ||
    /\bpublic tv\b/.test(text)
  ) {
    return {
      genre: "Public TV",
      confidence: "high",
    };
  }

  /*
   * WEATHER
   */
  if (
    /\bweather\b/.test(text) ||
    /\bhurricane\b/.test(text) ||
    /\bstorm\b/.test(text)
  ) {
    return {
      genre: "Weather",
      confidence: "high",
    };
  }

  /*
   * NEWS
   */
  if (
    /\bnews\b/.test(text) ||
    /\bbreaking\b/.test(text) ||
    /\bheadlines?\b/.test(text) ||
    /\bpolitics\b/.test(text) ||
    /\belection\b/.test(text) ||
    /\bcurrent affairs\b/.test(text)
  ) {
    return {
      genre: "News",
      confidence: "high",
    };
  }

  /*
   * CULTURE / INTERNATIONAL GENERAL TV
   *
   * Only suggest this for known-style broad
   * international/public channels. Do not use it
   * as a generic fallback.
   */
  if (
    /\barirang\b/.test(text) ||
    /\bnhk world\b/.test(text) ||
    /\bkbs world\b/.test(text) ||
    /\brtp internacional\b/.test(text)
  ) {
    return {
      genre: "Culture",
      confidence: "medium",
    };
  }

  return {
    genre: null,
    confidence: "none",
  };
}

const counts = {};
const generic = [];
const missing = [];
const suggestions = [];
const questionable = [];

for (const channel of channels) {
  const genre = String(channel.genre || "").trim();
  const category = String(channel.category || "").trim();

  const effective = genre || category || "(missing)";

  counts[effective] = (counts[effective] || 0) + 1;

  const genericGenre = GENERIC_VALUES.has(
    normalize(genre)
  );

  const genericCategory = GENERIC_VALUES.has(
    normalize(category)
  );

  if (!genre && !category) {
    missing.push({
      id: channel.id,
      name: channel.name,
    });
  }

  if (
    genericGenre ||
    genericCategory ||
    (!genre && category)
  ) {
    generic.push({
      id: channel.id,
      name: channel.name,
      genre: genre || "(none)",
      category: category || "(none)",
    });
  }

  const inferred = inferGenre(channel);

  if (
    inferred.genre &&
    (
      !genre ||
      genericGenre ||
      genericCategory
    )
  ) {
    suggestions.push({
      id: channel.id,
      name: channel.name,
      currentGenre: genre || "(none)",
      currentCategory: category || "(none)",
      suggestedGenre: inferred.genre,
      confidence: inferred.confidence,
    });
  }

  if (
    genre &&
    !APP_GENRES.has(genre) &&
    !GENERIC_VALUES.has(normalize(genre))
  ) {
    questionable.push({
      id: channel.id,
      name: channel.name,
      genre,
      category,
    });
  }
}

console.log("");
console.log("=================================");
console.log(" BUG EYEZ VIEW GENRE AUDIT");
console.log("=================================");
console.log("");

console.log(`Channels: ${channels.length}`);
console.log(`Missing both genre/category: ${missing.length}`);
console.log(`Generic/incomplete classification: ${generic.length}`);
console.log(`Automatic suggestions: ${suggestions.length}`);
console.log(`Custom/non-tab genres: ${questionable.length}`);

console.log("");
console.log("=== CURRENT CLASSIFICATION COUNTS ===");

for (
  const [key, count] of Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
) {
  console.log(
    `${String(key).padEnd(22)} ${count}`
  );
}

console.log("");
console.log("=== HIGH CONFIDENCE SUGGESTIONS ===");

for (
  const item of suggestions.filter(
    (item) => item.confidence === "high"
  )
) {
  console.log("");
  console.log(`${item.id}`);
  console.log(`  ${item.name}`);
  console.log(
    `  ${item.currentGenre} / ${item.currentCategory}`
  );
  console.log(
    `  => ${item.suggestedGenre}`
  );
}

console.log("");
console.log("=== MEDIUM CONFIDENCE SUGGESTIONS ===");

for (
  const item of suggestions.filter(
    (item) => item.confidence === "medium"
  )
) {
  console.log("");
  console.log(`${item.id}`);
  console.log(`  ${item.name}`);
  console.log(
    `  ${item.currentGenre} / ${item.currentCategory}`
  );
  console.log(
    `  => ${item.suggestedGenre}`
  );
}

console.log("");
console.log("=== STILL UNCLASSIFIED ===");

const suggestedIds = new Set(
  suggestions.map((item) => item.id)
);

for (const item of generic) {
  if (suggestedIds.has(item.id)) continue;

  console.log("");
  console.log(`${item.id}`);
  console.log(`  ${item.name}`);
  console.log(
    `  ${item.genre} / ${item.category}`
  );
}

console.log("");
console.log("=== EXISTING CUSTOM/NON-TAB GENRES ===");

for (const item of questionable) {
  console.log(
    `${item.id} — ${item.name} — ${item.genre}`
  );
}
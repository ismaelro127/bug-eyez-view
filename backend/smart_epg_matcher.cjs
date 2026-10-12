const fs = require('fs');
const path = require('path');
const fuzz = require('fuzzball');

const normalize = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
logger.info("✅ Normalized EPG matcher template ready.");

logger.info(`[${new Date().toISOString()}] [INIT] ⏬ Fetching M3U lists...`);

let m3uLists = [];
try {
  const filePath = path.join(__dirname, 'parsed_channels.json');
  m3uLists = JSON.parse(fs.readFileSync(filePath, 'utf8'));
} catch (err) {
  logger.error('[ERROR] Failed to load parsed_channels.json:', err.message);
  process.exit(1);
}

let epgData;
try {
  const epgFile = path.join(__dirname, 'epg', 'global-epg.xml');
  epgData = fs.readFileSync(epgFile, 'utf8');
} catch (err) {
  logger.error('[ERROR] Failed to load EPG XML file:', err.message);
  process.exit(1);
}

const extractEPGChannels = xml => {
  const matches = [...xml.matchAll(/<channel id="([^"]+)">\s*<display-name[^>]*>([^<]+)<\/display-name>/g)];
  return matches.map(([_, id, name]) => ({ id, name: name.trim() }));
};

logger.info(`[${new Date().toISOString()}] [STEP] 🧠 Parsing EPG channels...`);
const epgChannels = extractEPGChannels(epgData);

// Build normalized EPG name lookup
const epgChoices = epgChannels.map(c => ({
  id: c.id,
  name: c.name,
  norm: normalize(c.name)

}));

logger.info(`[${new Date().toISOString()}] [STEP] 🔍 Matching channels...`);
const matched = {};
const unmatched = [];

m3uLists.forEach(channel => {
  const nameRaw = (channel.name || channel.title || '').trim();
  const nameNorm = normalize(nameRaw);
  if (!nameNorm) return;

  const choices = epgChoices.map(c => c.norm);
  const best = fuzz.extract(nameNorm, choices, { scorer: fuzz.token_set_ratio, returnObjects: true, limit: 1 })[0];

  if (best && best.score >= 75) {
    const match = epgChoices.find(c => c.norm === best.choice);
    matched[nameNorm] = {
      epg_id: match.id,
      match_score: best.score,
      epg_name: match.name
    };
  } else {
    unmatched.push({
      channel_name: nameRaw,
      normalized: nameNorm,
      best_guess: best ? best.choice : null,
      similarity_score: best ? best.score : 0
    });
  }
});

// === Write outputs ===

fs.writeFileSync(
  path.join(__dirname, 'epg', 'enhanced_channel_epg_map.json'),
  JSON.stringify(matched, null, 2)
);

fs.writeFileSync(
  path.join(__dirname, 'epg', 'better_fuzzy_unmatched.json'),
  JSON.stringify(unmatched, null, 2)
);

const csvLines = ['Channel Name,EPG Match,Score,EPG ID'];
Object.entries(matched).forEach(([key, data]) => {
  csvLines.push(`"${key}","${data.epg_name}",${data.match_score},"${data.epg_id}"`);
});
unmatched.forEach(u => {
  csvLines.push(`"${u.channel_name}","${u.best_guess}",${u.similarity_score}",""`);
});

fs.writeFileSync(path.join(__dirname, 'logs', 'smart_epg_debug.csv'), csvLines.join('\n'));
fs.writeFileSync(path.join(__dirname, 'logs', 'unmatched_report.csv'),
  unmatched.map(u => `${u.channel_name},${u.best_guess},${u.similarity_score}`).join('\n')
);

logger.info(`[${new Date().toISOString()}] ✅ Matching complete: ${Object.keys(matched).length} matched, ${unmatched.length} unmatched.`);

// scripts/generate_epg_jsons.cjs
// ✅ Parses global-epg.xml → outputs one .json per channel in public/epg/

const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

const xmlPath = path.join(__dirname, '../backend/epg/global-epg.xml');
const outputDir = path.join(__dirname, '../frontend/public/epg');

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const parser = new xml2js.Parser();

fs.readFile(xmlPath, 'utf8', (err, xml) => {
  if (err) {
    logger.error('❌ Failed to read global-epg.xml:', err);
    return;
  }

  parser.parseString(xml, (err, result) => {
    if (err) {
      logger.error('❌ Failed to parse EPG XML:', err);
      return;
    }

    const programs = result.tv.programme || [];
    const grouped = {};

    programs.forEach((prog) => {
      const epgId = prog['$'].channel;
      if (!grouped[epgId]) grouped[epgId] = [];
      grouped[epgId].push({
        title: prog.title?.[0] || 'Untitled',
        start: prog['$'].start,
        end: prog['$'].stop
      });
    });

    Object.entries(grouped).forEach(([epgId, items]) => {
      const filePath = path.join(outputDir, `${epgId}.json`);
      fs.writeFileSync(filePath, JSON.stringify({ programs: items }, null, 2));
      logger.info(`✅ Wrote ${epgId}.json (${items.length} programs)`);
    });

    logger.info(`🎉 EPG JSON generation complete. Files saved to: ${outputDir}`);
  });
});

res.setHeader('Access-Control-Allow-Origin', '*'); // or 'http://localhost:3000'
res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
res.setHeader('Access-Control-Allow-Origin', '*'); // or 'http://localhost:3000'
res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

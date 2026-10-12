// backend/sync_epg_to_supabase.js
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const epgRoot = path.resolve("./epg");

async function uploadEPGFiles() {
  const channels = fs.readdirSync(epgRoot);
  for (const ch of channels) {
    const chDir = path.join(epgRoot, ch);
    const files = fs.readdirSync(chDir).filter(f => f.endsWith(".json"));

    for (const file of files) {
      const fullPath = path.join(chDir, file);
      const raw = fs.readFileSync(fullPath, "utf-8");
      let json;
      try {
        json = JSON.parse(raw);
      } catch (e) {
        logger.error(`❌ Failed to parse ${file}:`, e);
        continue;
      }

      const record = {
        channel_id: ch,
        date: json.date || new Date().toISOString().slice(0, 10),
        data: json,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("epg_data").upsert(record);
      if (error) logger.error(`⚠️ Upload failed for ${file}:`, error.message);
      else logger.info(`✅ Uploaded ${file}`);
    }
  }
  logger.info("📡 Sync complete.");
}

uploadEPGFiles();

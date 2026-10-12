import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { logger } from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHANNEL_FILE = path.join(__dirname, "../channels/channels.json");
const EPG_INDEX_FILE = path.join(__dirname, "../custom_epg_index.json");
const EPG_FOLDER = path.join(__dirname, "../epg");

let channelCache = null;
let epgCache = null;
let channelHash = null;
let epgHash = null;

async function loadJsonCached(filePath, cacheRef, hashRef) {
  const raw = await fs.readFile(filePath, "utf8");

  const hash = crypto.createHash("md5").update(raw).digest("hex");

  if (hashRef.value === hash && cacheRef.value) {
    return cacheRef.value;
  }

  const parsed = JSON.parse(raw);
  cacheRef.value = parsed;
  hashRef.value = hash;

  return parsed;
}

export async function getBugzChannels() {
  try {
    const data = await loadJsonCached(
      CHANNEL_FILE,
      { value: channelCache },
      { value: channelHash }
    );

    channelCache = data;

    return data.filter((ch) => ch.id?.startsWith("bugz_"));

  } catch (err) {
    logger.error({ err }, "BUGZ_CHANNELS_LOAD_FAILED");
    throw err;
  }
}

export async function getEpgList() {
  try {
    const files = await fs.readdir(EPG_FOLDER);
    return files
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(".json", ""));
  } catch {
    return [];
  }
}

export async function getEpgPrograms() {
  try {
    const data = await loadJsonCached(
      EPG_INDEX_FILE,
      { value: epgCache },
      { value: epgHash }
    );

    epgCache = data;

    return data.programs || [];

  } catch (err) {
    logger.error({ err }, "EPG_LOAD_FAILED");
    throw err;
  }
}
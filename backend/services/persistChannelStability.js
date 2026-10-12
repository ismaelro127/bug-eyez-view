import fs from "fs";
import path from "path";
import { computeChannelStability } from "../lib/computeChannelStability.js";
import { logger } from "../utils/logger.js";

const LEGAL_FILE = path.resolve(
  "frontend/public/legal_verified_channels.json"
);

export async function persistChannelStability() {
  if (!fs.existsSync(LEGAL_FILE)) {
    logger.warn("legal_verified_channels.json not found");
    return;
  }

  const raw = fs.readFileSync(LEGAL_FILE, "utf8");
  const channels = JSON.parse(raw);

  let updated = 0;

  for (const ch of channels) {
    try {
      const stability = await computeChannelStability(ch.id);

      if (stability == null) continue;

      ch.confidence = stability;
      ch.stable = stability >= 0.7;
      ch.lastVerified = new Date().toISOString();

      updated++;
    } catch (err) {
      logger.error(`Stability failed for ${ch.id}`, err.message);
    }
  }

  fs.writeFileSync(LEGAL_FILE, JSON.stringify(channels, null, 2));

  logger.info(`Stability persisted for ${updated} channels`);
}
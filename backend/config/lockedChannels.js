import fs from "fs";
import path from "path";

const filePath = path.join(
  process.cwd(),
  "/config/locked_channels.json"
);

const raw = fs.readFileSync(filePath, "utf-8");
const parsed = JSON.parse(raw);

export const LOCKED_CHANNEL_IDS = new Set(
  parsed.lockedChannelIds
);

import fs from "fs";
import path from "path";

const STATUS_FILE = path.resolve("backend/shared/epgStatus.json");

function readStatus() {
  if (!fs.existsSync(STATUS_FILE)) return {};
  return JSON.parse(fs.readFileSync(STATUS_FILE, "utf-8"));
}

function writeStatus(data) {
  fs.writeFileSync(STATUS_FILE, JSON.stringify(data, null, 2));
}

export function updateStatus(id, status, error = null) {
  const data = readStatus();
  data[id] = {
    status,
    lastRun: new Date().toISOString(),
    error,
  };
  writeStatus(data);
}

export function isDue(id, cadence) {
  const data = readStatus();
  const last = data[id]?.lastRun;
  if (!last) return true;

  const elapsed = Date.now() - new Date(last).getTime();

  const limits = {
    "3h": 3 * 60 * 60 * 1000,
    "6h": 6 * 60 * 60 * 1000,
    daily: 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000,
  };

  return elapsed > (limits[cadence] ?? 0);
}

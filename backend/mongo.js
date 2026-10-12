import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { logger } from "./utils/logger.js";

const MONGOD_PATH =
  "C:\\Users\\Bugz\\Desktop\\BugEyezView1\\BugEyezView\\mongodb\\bin\\mongod.exe";

const DATA_DIR = path.resolve("./mongo-data");
const PORT = 27017;

if (!fs.existsSync(DATA_DIR)) {
  logger.info("📁 Creating Mongo data directory:", DATA_DIR);
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

logger.info("🍃 Starting MongoDB...");
logger.info("📂 Data:", DATA_DIR);

const mongod = spawn(
  MONGOD_PATH,
  [
    "--dbpath",
    DATA_DIR,
    "--bind_ip",
    "127.0.0.1",
    "--port",
    PORT.toString(),
    "--replSet",
    "rs0", // 🔴 REQUIRED for transactions
  ],
  { stdio: "inherit" }
);

mongod.on("error", (err) => {
  logger.error("❌ MongoDB failed to start:", err);
});
mongod.stdout?.on("data", (data) => {
  const msg = data.toString();
  if (msg.includes("waiting for connections")) {
    logger.info("✅ MongoDB is ready");
  }
});

process.on("SIGINT", () => {
  logger.info("\n🛑 Node shutting down (Mongo left running)");
  process.exit();
});

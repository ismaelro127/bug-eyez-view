// backend/utils/aiService.js
import { spawn } from "child_process";
import { logger } from "../utils/logger.js";

let pythonProcess = null;

export function startAIService() {
  if (pythonProcess) return pythonProcess; // already running

  logger.info("🤖 Starting Bug Eyez AI microservice...");

  pythonProcess = spawn("python", ["main.py"], {
    stdio: "inherit", // so you can see AI logs in the same console
  });

  pythonProcess.on("error", (err) => {
    logger.error("❌ Failed to start AI microservice:", err);
  });

  pythonProcess.on("exit", (code, signal) => {
    logger.warn(`⚠️ AI microservice exited (code ${code}, signal ${signal})`);
    pythonProcess = null;
  });

  return pythonProcess;
}

export function stopAIService() {
  if (pythonProcess) {
    logger.info("🛑 Stopping Bug Eyez AI microservice...");
    pythonProcess.kill();
    pythonProcess = null;
  }
}

import { SCRAPERS } from "../scrapers/index.js";
import { updateStatus } from "./status.js";

export async function runAll() {
  for (const [id, scraper] of Object.entries(SCRAPERS)) {
    try {
      logger.info(`▶ Running ${id}`);
      await scraper.run();
      updateStatus(id, "success");
    } catch (err) {
      logger.error(`✖ ${id} failed`, err);
      updateStatus(id, "failed", err.message);
    }
  }
}

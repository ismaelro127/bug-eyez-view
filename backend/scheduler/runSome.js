import { SCRAPERS } from "../scrapers/index.js";
import { SCRAPER_REGISTRY } from "../scrapers/registry.js";
import { updateStatus, isDue } from "./status.js";

export async function runSome(group) {
  for (const [id, meta] of Object.entries(SCRAPER_REGISTRY)) {
    if (meta.group !== group) continue;

    if (!isDue(id, meta.cadence)) {
      logger.info(`⏭ Skipping ${id} (not due)`);
      continue;
    }

    try {
      logger.info(`▶ Running ${id}`);
      await SCRAPERS[id].run();
      updateStatus(id, "success");
    } catch (err) {
      logger.error(`✖ ${id} failed`, err);
      updateStatus(id, "failed", err.message);
    }
  }
}

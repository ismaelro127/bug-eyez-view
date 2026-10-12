import { processEventBatch } from "../workers/channelEventAggregator.js";
import { logger } from "../utils/logger.js";

export function startChannelEventWorker() {
  const run = async () => {
    try {
      const result = await processEventBatch();
      if (result?.processed > 0) {
        logger.info(`📦 Aggregated ${result.processed} events`);
      }
    } catch (err) {
      logger.error({ err }, "❌ Channel event aggregator failed");
    }
  };

  run(); // run immediately

  const timer = setInterval(run, 2000); // every 2 seconds

  logger.info("🚀 ChannelEventWorker running every 2s");

  return () => clearInterval(timer);
}


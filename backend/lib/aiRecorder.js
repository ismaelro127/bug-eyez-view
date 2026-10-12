import { recordChannelPattern } from "./recordChannelPattern.js";
import { logger } from "../utils/logger.js";

/**
 * Call this whenever a channel is detected as live
 */
export async function recordLiveChannel({
  channelId,
  title,
  category,
  startMin,
  delivery,
  source,
  region,
}) {
  if (!channelId) {
    logger.warn("recordLiveChannel called without channelId");
    return;
  }

  try {
    await recordChannelPattern({
      channelId,
      title,
      category,
      startMin,
      endMin: null,
      delivery,
      source,
      region,
    });
  } catch (err) {
    logger.error(
      { err, channelId },
      "AI recordLiveChannel failed"
    );
  }
}
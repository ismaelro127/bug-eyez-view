import "dotenv/config";
import { computeChannelStability } from "./lib/computeChannelStability.js";

const channelId = "test_channel_001";

const score = await computeChannelStability(channelId);
logger.info("Stability score:", score);

process.exit(0);

import User from "../models/User.js";
import { logger } from "../utils/logger.js";

const CAPTION_FEATURES = {
  native: true,
  ai_live: false,
  ai_on_demand: false,
};

export async function getCaptionCapabilities(userId) {
  if (!userId) {
    throw new Error("USER_REQUIRED");
  }

  try {
    const user = await User.findById(userId, { credits: 1 }).lean();

    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    return {
      ...CAPTION_FEATURES,
      credits: user.credits ?? 0,
    };

  } catch (err) {
    logger.error({ err, userId }, "CAPTION_CAPABILITIES_FAILED");
    throw err;
  }
}

export function validateCaptionMode(mode) {
  const allowed = ["ai_live", "ai_on_demand"];
  if (!allowed.includes(mode)) {
    throw new Error("INVALID_MODE");
  }

  if (!CAPTION_FEATURES[mode]) {
    throw new Error("MODE_DISABLED");
  }

  return true;
}
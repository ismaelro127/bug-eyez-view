import UserFeatures from "../models/UserFeatures.js";
import { ABUSE_THRESHOLDS } from "../config/abuseThresholds.js";

export async function isUnlockRestricted(userId) {
  const features = await UserFeatures.findOne({ userId }).lean();
  if (!features) return false;

  const now = new Date();

  // 🔒 Temporary restriction window (locks)
  if (features.restrictedUntil && features.restrictedUntil > now) {
    return true;
  }

  // 🕶️ Shadow restriction (silent deny)
  if (features.shadowRestricted) {
    return true;
  }

  // 🚨 Abuse hard-stop (derived, not magic number)
  if (
    typeof ABUSE_THRESHOLDS?.HARD_LOCK === "number" &&
    (features.abuseScore ?? 0) >= ABUSE_THRESHOLDS.HARD_LOCK
  ) {
    return true;
  }

  return false;
}

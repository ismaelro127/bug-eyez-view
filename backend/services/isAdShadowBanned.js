import UserFeatures from "../models/UserFeatures.js";

export async function isAdShadowBanned(userId) {
  const features = await UserFeatures.findOne({ userId }).lean();
  if (!features) return false;

  const now = new Date();

  // 🕶️ Explicit shadow restriction
  if (features.shadowRestricted === true) {
    return true;
  }

  // 🔒 Temporary restriction window
  if (features.restrictedUntil && features.restrictedUntil > now) {
    return true;
  }

  return false;
}

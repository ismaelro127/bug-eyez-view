import UserFeatures from "../models/UserFeatures.js";

export async function applyEscalation(userId) {
  const now = new Date();

  const features = await UserFeatures.findOne(
    { userId },
    { abuseScore: 1 }
  ).lean();

  if (!features) return;

  const score = features.abuseScore ?? 0;

  let update = {};
  let restrictedUntil = null;

  if (score >= 40) {
    update.trustTier = "shadow";
    restrictedUntil = new Date(
      now.getTime() + 12 * 60 * 60 * 1000
    );
  } else if (score >= 20) {
    update.trustTier = "restricted";
    restrictedUntil = new Date(
      now.getTime() + 2 * 60 * 60 * 1000
    );
  } else if (score >= 6) {
    update.trustTier = "normal";
  } else if (score < 3) {
    update.trustTier = "trusted";
    restrictedUntil = null;
  } else {
    return; // no change required
  }

  if (restrictedUntil !== null) {
    update.restrictedUntil = restrictedUntil;
  } else if (score < 3) {
    update.restrictedUntil = null;
  }

  await UserFeatures.updateOne(
    { userId },
    { $set: update }
  );
}
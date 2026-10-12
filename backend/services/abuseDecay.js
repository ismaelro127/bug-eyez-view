import UserFeatures from "../models/UserFeatures.js";

const ABUSE_DECAY_MS = 30 * 60 * 1000; // 30 min
const VIOLATION_DECAY_MS = 10 * 60 * 1000; // 10 min

export async function decayAbuseScores() {
  const now = new Date();

  const abuseCutoff = new Date(now.getTime() - ABUSE_DECAY_MS);
  const violationCutoff = new Date(now.getTime() - VIOLATION_DECAY_MS);

  // 1️⃣ Decay abuseScore safely
  await UserFeatures.updateMany(
    {
      abuseScore: { $gt: 0 },
      lastAbuseAt: { $lte: abuseCutoff },
      $or: [
        { restrictedUntil: null },
        { restrictedUntil: { $lte: now } },
      ],
    },
    {
      $inc: { abuseScore: -1 },
    }
  );

  // 2️⃣ Decay recentViolations safely
  await UserFeatures.updateMany(
    {
      recentViolations: { $gt: 0 },
      lastAbuseAt: { $lte: violationCutoff },
    },
    {
      $inc: { recentViolations: -1 },
    }
  );

  // 3️⃣ Clamp floor at zero
  await UserFeatures.updateMany(
    {
      $or: [
        { abuseScore: { $lt: 0 } },
        { recentViolations: { $lt: 0 } },
      ],
    },
    {
      $set: {
        abuseScore: 0,
        recentViolations: 0,
      },
    }
  );

  // 4️⃣ Recalculate trust tier in bulk
  await UserFeatures.updateMany(
    {
      abuseScore: { $lt: 3 },
      $or: [
        { restrictedUntil: null },
        { restrictedUntil: { $lte: now } },
      ],
    },
    {
      $set: { trustTier: "trusted" },
    }
  );

  await UserFeatures.updateMany(
    { abuseScore: { $gte: 3, $lt: 6 } },
    { $set: { trustTier: "normal" } }
  );

  await UserFeatures.updateMany(
    { abuseScore: { $gte: 6, $lt: 20 } },
    { $set: { trustTier: "restricted" } }
  );
}
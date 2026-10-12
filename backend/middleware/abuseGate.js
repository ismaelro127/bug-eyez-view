import UserFeatures from "../models/UserFeatures.js";

export default async function abuseGate(req, res, next) {
  // 🔒 Hard guard: auth must already have run
  if (!req.user?._id) {
    return res.status(401).json({ error: "UNAUTHORIZED" });
  }

  const features = await UserFeatures.findOne({
    userId: req.user._id,
  }).lean();

  if (!features) return next();

  const now = new Date();

  // 🚫 HARD restriction (explicit lock)
  if (features.restrictedUntil && features.restrictedUntil > now) {
    return res.status(429).json({
      error: "TEMPORARILY_RESTRICTED",
      until: features.restrictedUntil,
    });
  }

  // 🕶️ Shadow restriction = allow but flag
  if (features.shadowRestricted === true) {
    // Optional: attach context for downstream logging
    req.shadowRestricted = true;
  }

  next();
}

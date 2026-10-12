import express from "express";
import User from "../../models/User.js";
import UserFeatures from "../../models/UserFeatures.js";
import CreditLedger from "../../models/CreditLedger.js";

const router = express.Router();

/**
 * GET /api/admin/users
 * List users (basic info)
 */
router.get("/", async (_req, res) => {
  const users = await User.find({})
    .select("_id email roles createdAt")
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  res.json({ users });
});

/**
 * GET /api/admin/users/:id
 * User summary (credits + trust)
 */
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  const [user, features, creditAgg] = await Promise.all([
    User.findById(id).lean(),
    UserFeatures.findOne({ userId: id }).lean(),
    CreditLedger.aggregate([
      { $match: { userId: id } },
      { $group: { _id: null, balance: { $sum: "$delta" } } },
    ]),
  ]);

  if (!user) {
    return res.status(404).json({ error: "USER_NOT_FOUND" });
  }

  res.json({
    user,
    trustTier: features?.trustTier ?? "normal",
    abuseScore: features?.abuseScore ?? 0,
    credits: creditAgg[0]?.balance ?? 0,
  });
});

/**
 * POST /api/admin/users/:id/role
 * Change role flags
 */
router.post("/:id/role", async (req, res) => {
  const { id } = req.params;
  const { admin, premium } = req.body;

  await User.updateOne(
    { _id: id },
    {
      $set: {
        "roles.admin": !!admin,
        "roles.premium": !!premium,
      },
    }
  );

  res.json({ ok: true });
});

/**
 * POST /api/admin/users/:id/trust
 * Override trust tier
 */
router.post("/:id/trust", async (req, res) => {
  const { id } = req.params;
  const { tier } = req.body;

  const allowed = ["trusted", "normal", "restricted", "shadow"];
  if (!allowed.includes(tier)) {
    return res.status(400).json({ error: "INVALID_TRUST_TIER" });
  }

  await UserFeatures.findOneAndUpdate(
    { userId: id },
    { trustTier: tier },
    { upsert: true, new: true }
  );

  res.json({ ok: true, userId: id, trustTier: tier });
});

router.post("/:id/shadow", async (req, res) => {
  const { id } = req.params;

  await UserFeatures.findOneAndUpdate(
    { userId: id },
    { trustTier: "shadow" },
    { upsert: true }
  );

  res.json({ ok: true, userId: id, shadowed: true });
});

router.post("/:id/grant", async (req, res) => {
  const { id } = req.params;
  const { amount, reason = "admin_grant" } = req.body;

  if (typeof amount !== "number" || amount <= 0) {
    return res.status(400).json({ error: "INVALID_AMOUNT" });
  }

  const result = await mintCredits({
    userId: id,
    amount,
    reason,
    source: "admin",
    refType: "admin_op",
    refId: `admin_grant_${Date.now()}`,
  });

  res.json({
    ok: true,
    userId: id,
    credits: result.credits,
  });
});

router.post("/:id/logout", async (req, res) => {
  const { id } = req.params;

  await UserFeatures.findOneAndUpdate(
    { userId: id },
    { forceLogoutAt: new Date() },
    { upsert: true }
  );

  res.json({ ok: true, userId: id, forcedLogout: true });
});

export default router;

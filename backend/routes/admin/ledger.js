import express from "express";
import CreditLedger from "../../models/CreditLedger.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const { userId, limit = 100 } = req.query;

  const q = {};
  if (userId) q.userId = userId;

  const entries = await CreditLedger.find(q)
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .lean();

  res.json({ entries });
});

export default router;

import express from "express";
import CreditLedger from "../models/CreditLedger.js";
import authMiddleware from "../middleware/authMiddleware.js";
import requireAdmin from "../middleware/requireAdmin.js";

const router = express.Router();

// 🔒 lock it down
router.use(authMiddleware, requireAdmin);

/**
 * GET /api/admin/ledger
 * Admin-only: fetch recent credit ledger entries
 */
router.get("/ledger", async (req, res) => {
  try {
    const ledger = await CreditLedger.find({})
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    res.json({ ledger });
  } catch (err) {
    logger.error("Admin ledger fetch failed:", err);
    res.status(500).json({ error: "FAILED_TO_FETCH_LEDGER" });
  }
});

export default router;

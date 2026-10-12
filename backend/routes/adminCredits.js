import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import adminOnly from "../middleware/adminOnly.js";
import { reverseLedgerTxn } from "../services/reverseLedgerTxn.js";

const router = express.Router();

// 🔐 Auth + Admin only
router.use(authMiddleware);
router.use(adminOnly);

/**
 * ================================
 * POST /api/admin/credits/reverse
 * ================================
 *
 * Body:
 * {
 *   txnId: string,      // txnId OR _id
 *   reason?: string,
 *   note?: string
 * }
 */
router.post("/reverse", async (req, res) => {
  try {
    const { txnId, reason, note } = req.body;

    if (!txnId) {
      return res.status(400).json({ error: "MISSING_TXN_ID" });
    }

    const result = await reverseLedgerTxn({
      adminId: req.user._id,
      targetTxnId: txnId,
      reason: reason || "admin_refund",
      note: note || "",
    });

    return res.json(result);
  } catch (err) {
    logger.error("❌ ADMIN REVERSAL ERROR", err);

    return res.status(400).json({
      error: err.message || "REVERSAL_FAILED",
    });
  }
});

export default router;

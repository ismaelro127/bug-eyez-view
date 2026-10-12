import CreditLedger from "../models/CreditLedger.js";
import { buildTxHash } from "./creditService.js";

export async function verifyUserLedger(userId) {
  const txs = await CreditLedger.find({ userId })
    .sort({ createdAt: 1 })
    .lean();

  if (txs.length === 0) {
    return { ok: true, message: "No ledger entries" };
  }

  let expectedPrevHash = "GENESIS";

  for (const tx of txs) {
    // 1️⃣ Verify prevHash continuity
    if (tx.prevHash !== expectedPrevHash) {
      return {
        ok: false,
        error: "Hash chain broken",
        atTxnId: tx.txnId,
      };
    }

    // 2️⃣ Rebuild hash
    const rebuiltHash = buildTxHash({
  userId: tx.userId.toString(),
  delta: tx.delta,
  reason: tx.reason,
  source: tx.source,
  refType: tx.refType,
  refId: tx.refId,
  prevHash: tx.prevHash,
});


    // 3️⃣ Compare
    if (rebuiltHash !== tx.txHash) {
      return {
        ok: false,
        error: "Hash mismatch",
        atTxnId: tx.txnId,
      };
    }

    expectedPrevHash = tx.txHash;
  }

  return {
    ok: true,
    count: txs.length,
  };
}

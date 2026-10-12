import mongoose from "mongoose";
import CreditLedger from "../models/CreditLedger.js";
import UserBalance from "../models/UserBalance.js";
import { buildTxHash } from "./creditService.js";
import { v4 as uuid } from "uuid";

export async function reverseLedgerTxn({
  adminId,          // who did it (admin/system)
  targetTxnId,      // txnId OR _id of original
  reason = "refund",
  note = "",
}) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1️⃣ Find original txn
    const original = await CreditLedger.findOne(
      {
        $or: [{ txnId: targetTxnId }, { _id: targetTxnId }],
        status: "posted",
      },
      null,
      { session }
    );

    if (!original) {
      throw new Error("ORIGINAL_TXN_NOT_FOUND_OR_ALREADY_REVERSED");
    }

    // 2️⃣ Prevent double reversal
    const existing = await CreditLedger.findOne(
      { reversalOf: original._id },
      null,
      { session }
    );

    if (existing) {
      throw new Error("TXN_ALREADY_REVERSED");
    }

    // 3️⃣ Load balance
    const balance = await UserBalance.findOne(
      { userId: original.userId },
      null,
      { session }
    );

    if (!balance) {
      throw new Error("USER_BALANCE_NOT_FOUND");
    }

    // 4️⃣ Build hash chain
    const lastTx = await CreditLedger.findOne(
      { userId: original.userId },
      {},
      { session, sort: { createdAt: -1 } }
    );

    const prevHash = lastTx ? lastTx.txHash : "GENESIS";

    const reversalDelta = -original.delta;

    const txHash = buildTxHash({
      userId: original.userId,
      delta: reversalDelta,
      reason,
      source: "admin",
      refType: "admin_reversal",
      refId: `reversal_${original.txnId}`,
      prevHash,
    });

    // 5️⃣ Create reversal ledger entry
    await CreditLedger.create(
      [
        {
          txnId: uuid(),
          userId: original.userId,
          delta: reversalDelta,
          reason,
          source: "admin",
          refType: "admin_reversal",
          refId: `reversal_${original.txnId}`,
          prevHash,
          txHash,
          reversalOf: original._id,
          meta: {
            adminId,
            note,
            originalTxnId: original.txnId,
          },
        },
      ],
      { session }
    );

    // 6️⃣ Update balance
    balance.credits += reversalDelta;
    balance.version += 1;
    await balance.save({ session });

    // 7️⃣ Mark original as reversed (optional but recommended)
    original.status = "reversed";
    await original.save({ session });

    await session.commitTransaction();

    return {
      ok: true,
      reversedTxnId: original.txnId,
      newBalance: balance.credits,
    };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

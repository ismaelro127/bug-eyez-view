// backend/services/reverseCredits.js
import mongoose from "mongoose";
import { v4 as uuid } from "uuid";

import UserBalance from "../models/UserBalance.js";
import CreditLedger from "../models/CreditLedger.js";
import { buildTxHash } from "./creditService.js";

/**
 * Reverse a previous ledger entry by creating a compensating transaction.
 * Ledger stays immutable; reversal is a new entry with delta = -original.delta.
 *
 * Use cases:
 * - fraud / chargeback
 * - manual admin correction
 * - automated abuse remediation
 */
export async function reverseCredits({
  userId,
  originalTxnId,     // txnId of the ledger row being reversed
  reason = "reversal",
  source = "system", // "admin" | "system"
  refId,             // unique idempotency key for the reversal
  meta = {},
}) {
  if (!userId) throw new Error("Missing userId");
  if (!originalTxnId) throw new Error("Missing originalTxnId");
  if (!refId) throw new Error("Missing refId (idempotency)");

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1) Load original tx
    const original = await CreditLedger.findOne(
      { txnId: originalTxnId, userId },
      null,
      { session }
    );

    if (!original) {
      throw Object.assign(new Error("Original transaction not found"), {
        code: "ORIGINAL_TX_NOT_FOUND",
      });
    }

    // 2) Prevent reversing reversals
    if (original.refType === "reversal") {
      throw Object.assign(new Error("Cannot reverse a reversal"), {
        code: "INVALID_REVERSAL_TARGET",
      });
    }

    // 3) Idempotency: same reversal refId should not create twice
    const existing = await CreditLedger.findOne(
      {
        userId,
        refType: "reversal",
        refId,
      },
      null,
      { session }
    );

    if (existing) {
      // Already reversed with this key — return current balance
      const bal = await UserBalance.findOne({ userId }, null, { session });
      return { ok: true, already: true, credits: bal?.credits ?? 0 };
    }

    // 4) Compute reversal delta
    const reversalDelta = -1 * Number(original.delta || 0);
    if (!Number.isFinite(reversalDelta) || reversalDelta === 0) {
      throw Object.assign(new Error("Invalid original delta"), {
        code: "INVALID_ORIGINAL_DELTA",
      });
    }

    // 5) Lock balance doc
    const balance = await UserBalance.findOne({ userId }, null, { session });
    if (!balance) throw Object.assign(new Error("Balance not found"), { code: "BALANCE_NOT_FOUND" });

    // Optional safety: do not allow balance to go below 0 from a reversal
    // (some platforms allow negative; choose your policy)
    const nextCredits = balance.credits + reversalDelta;
    if (nextCredits < 0) {
      throw Object.assign(new Error("Reversal would make balance negative"), {
        code: "REVERSAL_NEGATIVE_BALANCE",
        nextCredits,
      });
    }

    // 6) Hash chain
    const lastTx = await CreditLedger.findOne(
      { userId },
      {},
      { session, sort: { createdAt: -1 } }
    );

    const prevHash = lastTx ? lastTx.txHash : "GENESIS";

    const txHash = buildTxHash({
      userId,
      delta: reversalDelta,
      reason,
      source,
      refType: "reversal",
      refId,
      prevHash,
    });

    // 7) Write ledger reversal entry
    await CreditLedger.create(
      [
        {
          txnId: uuid(),
          userId,
          delta: reversalDelta,
          reason,                // e.g. "fraud_reversal" | "admin_refund"
          source,                // "admin" | "system"
          refType: "reversal",
          refId,                 // idempotency key (unique per reversal)
          prevHash,
          txHash,
          ip: meta?.ip,
          userAgent: meta?.userAgent,
          meta: {
            ...meta,
            originalTxnId,
            originalRefType: original.refType,
            originalRefId: original.refId,
            originalReason: original.reason,
          },
        },
      ],
      { session }
    );

    // 8) Update balance
    balance.credits = nextCredits;
    balance.version = (balance.version || 0) + 1;
    await balance.save({ session });

    await session.commitTransaction();

    return {
      ok: true,
      credits: balance.credits,
      reversed: {
        originalTxnId,
        reversalDelta,
      },
    };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

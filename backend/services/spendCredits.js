import mongoose from "mongoose";
import UserBalance from "../models/UserBalance.js";
import CreditLedger from "../models/CreditLedger.js";
import { buildTxHash } from "./buildTxHash.js";
import { v4 as uuid } from "uuid";

const MAX_RETRIES = 3;

export async function spendCredits({
  userId,
  cost,
  action,
  source,
  refId,
  meta,
}) {
  if (cost <= 0) throw new Error("Invalid spend amount");

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 🔒 Strict idempotency
      const existing = await CreditLedger.findOne(
        { userId, refType: "feature_unlock", refId },
        null,
        { session }
      );

      if (existing) {
        await session.abortTransaction();
        return { alreadyProcessed: true };
      }

      // 🔗 Fetch previous hash
      const lastTx = await CreditLedger.findOne(
        { userId },
        {},
        { session, sort: { createdAt: -1 } }
      );

      const prevHash = lastTx ? lastTx.txHash : "GENESIS";

      const txHash = buildTxHash({
        userId: userId.toString(),
        delta: -cost,
        reason: action,
        source,
        refType: "feature_unlock",
        refId,
        prevHash,
      });

      // 📒 Append ledger entry FIRST
      await CreditLedger.create(
        [
          {
            txnId: uuid(),
            userId,
            delta: -cost,
            reason: action,
            source,
            refType: "feature_unlock",
            refId,
            prevHash,
            txHash,
            meta,
          },
        ],
        { session }
      );

      // 💰 Atomic conditional decrement (prevents double-spend)
      const result = await UserBalance.updateOne(
        { userId, credits: { $gte: cost } },
        {
          $inc: { credits: -cost, version: 1 },
        },
        { session }
      );

      if (result.modifiedCount === 0) {
        throw new Error("Insufficient credits");
      }

      await session.commitTransaction();
      return { ok: true };

    } catch (err) {
      await session.abortTransaction();

      // 🔁 Retry transient transaction errors
      if (
        err?.errorLabels?.includes("TransientTransactionError") &&
        attempt < MAX_RETRIES
      ) {
        continue;
      }

      throw err;
    } finally {
      session.endSession();
    }
  }
}
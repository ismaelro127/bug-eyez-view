logger.info("🟢 mintCredits LOADED");
import mongoose from "mongoose";
import { v4 as uuid } from "uuid";
import UserBalance from "../models/UserBalance.js";
import CreditLedger from "../models/CreditLedger.js";
import { buildTxHash } from "./buildTxHash.js";
import { Types } from "mongoose";
import UserFeatures from "../models/UserFeatures.js";
import { logger } from "../utils/logger.js";

const MAX_RETRIES = 3;

export async function mintCredits(args) {
  const {
    userId,
    amount,
    reason,
    source,
    refType,
    refId,
    ip,
    userAgent,
    meta,
  } = args;

  if (amount <= 0) throw new Error("Invalid mint amount");

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 🔒 Strict idempotency
      const exists = await CreditLedger.findOne(
        { refType, refId },
        null,
        { session }
      );

      if (exists) {
        await session.abortTransaction();
        return { alreadyProcessed: true };
      }

      // 🔗 Fetch last hash
      const lastTx = await CreditLedger.findOne(
        { userId },
        {},
        { session, sort: { createdAt: -1 } }
      );

      const prevHash = lastTx ? lastTx.txHash : "GENESIS";

      const txHash = buildTxHash({
        userId: userId.toString(),
        delta: amount,
        reason,
        source,
        refType,
        refId,
        prevHash,
      });

      await CreditLedger.create(
        [
          {
            txnId: uuid(),
            userId,
            delta: amount,
            reason,
            source,
            refType,
            refId,
            prevHash,
            txHash,
            ip,
            userAgent,
            meta,
          },
        ],
        { session }
      );

      // 💰 Atomic increment
      await UserBalance.updateOne(
        { userId },
        {
          $inc: { credits: amount, version: 1 },
        },
        { upsert: true, session }
      );

      await session.commitTransaction();
      return { ok: true };

    } catch (err) {
      await session.abortTransaction();

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
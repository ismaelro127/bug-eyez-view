import mongoose from "mongoose";

const CoinLedgerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    reason: {
      type: String,
      enum: [
        "rewarded_ad",
        "manual_grant",
        "feature_unlock",
        "admin_adjustment",
      ],
      required: true,
    },

    metadata: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

export const CoinLedger =
  mongoose.models.CoinLedger ||
  mongoose.model("CoinLedger", CoinLedgerSchema);

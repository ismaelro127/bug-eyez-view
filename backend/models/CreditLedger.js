import mongoose from "mongoose";

const CreditLedgerSchema = new mongoose.Schema(
  {
    txnId: {
      type: String,
      required: true,
      unique: true, // UUID / ULID
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      required: true,
    },

    delta: {
      type: Number,
      required: true, // +earn / -spend
    },

    reason: {
      type: String,
      required: true, // purchase | rewarded_ad | spend | refund | admin
    },

    source: {
      type: String,
      required: true, // stripe | ad | admin | system
    },

    refType: {
      type: String,
      required: true, // stripe_payment | ad_event | admin_op
    },

    refId: {
      type: String,
      required: true,
    },

    prevHash: {
      type: String,
      required: true,
    },

    txHash: {
      type: String,
      required: true,
      index: true,
    },

    keyId: {
      type: String,
      default: "v1", // allows secret rotation
    },

    status: {
  type: String,
  enum: ["posted", "reversed"],
  default: "posted",
  index: true,
},

reversalOf: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "CreditLedger",
  default: null,
},

    ip: String,
    userAgent: String,

    meta: {
      type: Object,
    },
    rewardType: { type: String }, // "ad"
    rewardKey: { type: String },  // ad session id
    effectiveDeviceHash: { type: String }, // optional
    },
  
    { timestamps: true }
);

// 🔒 Idempotency guarantee
CreditLedgerSchema.index({ refType: 1, refId: 1 }, { unique: true });

export default mongoose.model("CreditLedger", CreditLedgerSchema);

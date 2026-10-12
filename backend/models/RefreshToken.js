import mongoose from "mongoose";

const RefreshTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
    tokenHash: { type: String, unique: true, index: true, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    meta: {
      ip: { type: String, default: null },
      userAgent: { type: String, default: null },
    },
  },
  { timestamps: true }
);

// TTL cleanup for expired tokens (Mongo will delete after expiresAt)
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("RefreshToken", RefreshTokenSchema);

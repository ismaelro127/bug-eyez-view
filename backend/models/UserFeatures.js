import mongoose from "mongoose";

const UserFeaturesSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      unique: true,
      required: true,
    },

    trustTier: {
      type: String,
      enum: ["trusted", "normal", "restricted", "shadow"],
      default: "normal",
      index: true,
    },

    totalRewardedAds: {
      type: Number,
      default: 0,
      index: true,
    },

    trustTierLocked: {
      type: Boolean,
      default: false,
    },

    recentViolations: {
      type: Number,
      default: 0,
    },

    lastDeviceHash: {
      type: String,
      default: null,
    },

    unlockedChannels: {
      type: [String],
      default: [],
      index: true,
    },

    unlockCooldowns: {
      type: Map,
      of: Date,
      default: {},
    },

    skipAdsUntil: {
      type: Date,
      default: null,
    },

    youtubePackUnlocked: {
      type: Boolean,
      default: false,
      index: true,
    },

    youtubePackUnlockedAt: {
      type: Date,
      default: null,
    },

    youtubePackExpiresAt: {
      type: Date,
      default: null,
      index: true,
    },

    abuseScore: {
      type: Number,
      default: 0,
    },

    restrictedUntil: {
      type: Date,
      default: null,
    },

    lastAbuseAt: {
      type: Date,
      default: null,
    },

    abuseLog: [
      {
        reason: { type: String, required: true },
        points: { type: Number, required: true },
        at: { type: Date, default: Date.now },
        meta: { type: mongoose.Schema.Types.Mixed },
      },
    ],
  },
  { timestamps: true }
);


export default mongoose.models.UserFeatures ||
  mongoose.model("UserFeatures", UserFeaturesSchema);

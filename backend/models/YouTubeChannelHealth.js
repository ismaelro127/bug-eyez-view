import mongoose from "mongoose";

const youtubeChannelHealthSchema = new mongoose.Schema(
  {
    channelId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    youtubeId: {
      type: String,
      required: true,
      index: true,
    },

    channelName: {
      type: String,
      default: null,
    },

    playable: {
      type: Boolean,
      default: false,
      index: true,
    },

    status: {
      type: String,
      enum: [
        "unknown",
        "checking",
        "live",
        "unavailable",
        "error",
      ],
      default: "unknown",
      index: true,
    },

    reason: {
      type: String,
      default: null,
    },

    errorCode: {
      type: String,
      default: null,
    },

    lastCheckedAt: {
      type: Date,
      default: null,
      index: true,
    },

    lastPlayableAt: {
      type: Date,
      default: null,
    },

    lastUnavailableAt: {
      type: Date,
      default: null,
    },

    consecutiveSuccesses: {
      type: Number,
      default: 0,
    },

    consecutiveFailures: {
      type: Number,
      default: 0,
    },

    checkDurationMs: {
      type: Number,
      default: null,
    },

    lastSource: {
      type: String,
      enum: [
        "background_scan",
        "purchase_check",
        "manual",
        null,
      ],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

youtubeChannelHealthSchema.index({
  playable: 1,
  lastCheckedAt: 1,
});

youtubeChannelHealthSchema.index({
  status: 1,
  lastCheckedAt: 1,
});

const YouTubeChannelHealth =
  mongoose.models.YouTubeChannelHealth ||
  mongoose.model(
    "YouTubeChannelHealth",
    youtubeChannelHealthSchema
  );

export default YouTubeChannelHealth;

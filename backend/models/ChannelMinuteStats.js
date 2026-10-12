import mongoose from "mongoose";

const ChannelMinuteStatsSchema = new mongoose.Schema(
  {
    channel_id: { type: String, required: true, index: true },
    minute_bucket: { type: Number, required: true, index: true }, // floor(Date.now()/60000)

    plays: { type: Number, default: 0 },
    fails: { type: Number, default: 0 },

    // watch tracking
    stop_count: { type: Number, default: 0 },
    watch_sum: { type: Number, default: 0 }, // sum of duration_seconds
  },
  { timestamps: true }
);

// One doc per channel per minute
ChannelMinuteStatsSchema.index(
  { channel_id: 1, minute_bucket: 1 },
  { unique: true }
);

ChannelMinuteStatsSchema.index({ minute_bucket: -1 });

ChannelMinuteStatsSchema.index(
  { channel_id: 1, minute_bucket: -1 }
);

ChannelMinuteStatsSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 7 }
);

export default mongoose.models.ChannelMinuteStats ||
  mongoose.model("ChannelMinuteStats", ChannelMinuteStatsSchema);
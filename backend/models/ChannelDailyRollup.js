import mongoose from "mongoose";

const ChannelDailyRollupSchema = new mongoose.Schema(
  {
    channel_id: { type: String, required: true, index: true },
    day: { type: String, required: true, index: true }, // YYYY-MM-DD

    plays: { type: Number, default: 0 },
    fails: { type: Number, default: 0 },
    stops: { type: Number, default: 0 },

    watch_time_sum: { type: Number, default: 0 },
    watch_time_count: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// One doc per channel per day
ChannelDailyRollupSchema.index(
  { channel_id: 1, day: 1 },
  { unique: true }
);

// Reporting queries
ChannelDailyRollupSchema.index({ day: -1 });
ChannelDailyRollupSchema.index({ channel_id: 1, day: -1 });

export default mongoose.models.ChannelDailyRollup ||
  mongoose.model("ChannelDailyRollup", ChannelDailyRollupSchema);
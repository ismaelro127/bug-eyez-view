import mongoose from "mongoose";

const EventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: [
        "channel-play-started",
        "channel-play-failed",
        "channel-play-stopped",
        "channel-buffering",
        "channel-heartbeat",
      ],
      index: true,
    },

    channel_id: {
      type: String,
      index: true,
    },

    delivery: {
      type: String,
      index: true, // helpful for analytics (youtube vs embed etc)
    },

    user_id: {
      type: String,
      index: true,
    },

    meta: {
      type: mongoose.Schema.Types.Mixed,
    },

    session_id: {
      type: String,
      index: true,
    },

    started_at: {
      type: Date,
    },

    duration_seconds: {
      type: Number,
      min: 0,
    },

    // 🔥 Optional: normalized minute bucket (helps rollups massively)
    minute_bucket: {
      type: Number,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/* =========================================================
   🔥 CRITICAL PERFORMANCE INDEXES
   ========================================================= */

// Health processing (group by channel + type + recent window)
// Health & rollups
EventSchema.index({ channel_id: 1, createdAt: -1 });

// Daily aggregation support
EventSchema.index({ createdAt: 1, channel_id: 1, type: 1 });

// Session correlation
EventSchema.index({ session_id: 1, type: 1 });

// User analytics (if needed)
EventSchema.index({ user_id: 1, createdAt: -1 });

EventSchema.index({ createdAt: 1 });
EventSchema.index({ channel_id: 1, createdAt: 1 });
// Minute bucket rollups
EventSchema.index({ minute_bucket: 1, channel_id: 1 });/* =========================================================
   🔥 OPTIONAL: TTL retention (uncomment if desired)
   Deletes raw events after X days
   ========================================================= */

// EventSchema.index(
//   { createdAt: 1 },
//   { expireAfterSeconds: 60 * 60 * 24 * 90 } // 90 days
// );

export default mongoose.models.Event ||
  mongoose.model("Event", EventSchema);

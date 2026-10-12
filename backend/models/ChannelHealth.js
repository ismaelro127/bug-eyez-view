import mongoose from "mongoose";

const ChannelHealthSchema = new mongoose.Schema(
  {
    channel_id: {
  type: String,
  required: true,
  unique: true,
},

    /* =============================
       Lifetime Stats
       ============================= */

    total_plays: { type: Number, default: 0 },
    total_fails: { type: Number, default: 0 },

    success_rate: {
      type: Number,
      default: 1,
      min: 0,
      max: 1,
    },

    /* =============================
       Recent Window Stats
       ============================= */

    recent_plays: { type: Number, default: 0 },
    recent_fails: { type: Number, default: 0 },

    recent_success_rate: {
      type: Number,
      default: 1,
      min: 0,
      max: 1,
    },

    /* =============================
       Health Scoring
       ============================= */

    health_score: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },

    tier: {
      type: String,
      enum: ["high", "medium", "unstable"],
      default: "high",
      index: true,
    },

    confidence: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },

    avg_watch_time: {
      type: Number,
      default: 0,
    },

    /* =============================
       Suppression / Cooldown
       ============================= */

    suppressed: {
      type: Boolean,
      default: false,
      index: true,
    },

    suppressed_reason: {
      type: String,
      default: "",
    },

    suppressed_until: {
      type: Date,
      default: null,
      index: true,
    },

    /* =============================
       Hard Disable
       ============================= */

    is_disabled: {
      type: Boolean,
      default: false,
    },

    disabled_reason: {
      type: String,
      default: "",
    },

    disabled_at: {
      type: Date,
      default: null,
      index: true,
    },

    /* =============================
       Metadata
       ============================= */

    last_updated: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

/* =========================================================
   🔥 Index Strategy (Important for Scale)
   ========================================================= */

// Fast enforcement queries
ChannelHealthSchema.index(
  { suppressed: 1, suppressed_until: 1 },
  { partialFilterExpression: { suppressed: true } }
);
ChannelHealthSchema.index({ is_disabled: 1 });

ChannelHealthSchema.pre("save", function(next) {
  this.last_updated = new Date();
  next();
});

// Ranking queries
ChannelHealthSchema.index({ tier: 1, health_score: -1 });

// Cleanup query
ChannelHealthSchema.index({ last_updated: -1 });

ChannelHealthSchema.index({ health_score: 1 });

export default mongoose.models.ChannelHealth ||
  mongoose.model("ChannelHealth", ChannelHealthSchema);

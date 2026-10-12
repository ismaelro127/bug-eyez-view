import mongoose from "mongoose";

const HealthCursorSchema = new mongoose.Schema(
  {
    // unique cursor name (ex: "channel_health")
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // last event timestamp processed
    last_processed_at: {
      type: Date,
      default: null,
      index: true,
    },

    // distributed lock support
    locked_by: {
      type: String,
      default: null,
      index: true,
    },

    lock_expires_at: {
      type: Date,
      default: null,
      index: true,
    },

    // optional metadata
    meta: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// compound index for lock cleanup
HealthCursorSchema.index({
  key: 1,
  lock_expires_at: 1,
});

export default mongoose.models.HealthCursor ||
  mongoose.model("HealthCursor", HealthCursorSchema);

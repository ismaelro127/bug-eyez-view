import mongoose from "mongoose";

const UserActivitySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    action: { type: String, required: true },
    source: String,
    duration: Number,
    ip: String,
    userAgent: String,
  },
  { timestamps: true }
);

export default mongoose.model("UserActivity", UserActivitySchema);

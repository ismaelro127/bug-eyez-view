import mongoose from "mongoose";

const UnlockedChannelSchema = new mongoose.Schema(
  {
userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      required: true,
    },
    channelId: { type: String, index: true, required: true },
  },
  { timestamps: true }
);

UnlockedChannelSchema.index({ userId: 1, channelId: 1 }, { unique: true });

export default mongoose.model(
  "UnlockedChannel",
  UnlockedChannelSchema
);

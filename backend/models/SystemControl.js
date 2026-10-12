import mongoose from "mongoose";

const SystemControlSchema = new mongoose.Schema(
  {
    pipelineEnabled: { type: Boolean, default: true },
    adsEnabled: { type: Boolean, default: true },
    creditsEnabled: { type: Boolean, default: true },
    emergencyLockdown: { type: Boolean, default: false },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model("SystemControl", SystemControlSchema);

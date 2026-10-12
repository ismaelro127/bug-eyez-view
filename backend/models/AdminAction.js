import mongoose from "mongoose";

const AdminActionSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    targetUserId: { type: mongoose.Schema.Types.ObjectId },
    meta: { type: Object },
  },
  { timestamps: true }
);

export default mongoose.model("AdminAction", AdminActionSchema);

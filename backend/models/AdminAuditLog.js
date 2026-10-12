import mongoose from "mongoose";

const AdminAuditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    meta: {
      type: Object,
    },
  },
  { timestamps: true }
);

export default mongoose.model("AdminAuditLog", AdminAuditLogSchema);

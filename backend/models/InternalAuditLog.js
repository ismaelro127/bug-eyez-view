import mongoose from "mongoose";

const InternalAuditLogSchema = new mongoose.Schema(
  {
    action: String,
    userId: mongoose.Schema.Types.ObjectId,
    ip: String,
    metadata: Object,
  },
  { timestamps: true }
);

InternalAuditLogSchema.index({ createdAt: -1 });

export default mongoose.model("InternalAuditLog", InternalAuditLogSchema);
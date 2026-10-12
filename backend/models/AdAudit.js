// models/AdAudit.js
const AdAuditSchema = new mongoose.Schema({
  userId: ObjectId,
  adSessionId: String,
  channelId: String,
  outcome: {
    type: String,
    enum: ["rewarded", "shadowed", "blocked", "cooldown"],
  },
  ip: String,
  effectiveDeviceHash\: String,
  createdAt: { type: Date, default: Date.now },
});

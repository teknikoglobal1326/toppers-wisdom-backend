const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "actorModel"
    },
    actorModel: {
      type: String,
      required: true,
      enum: ["Member", "Admin"]
    },
    actorName: { type: String, required: true },
    roleName: { type: String, required: true },
    module: { type: String, required: true },
    action: { type: String, required: true },
    status: { type: String, enum: ["success", "failed"], default: "success" },
    ipAddress: { type: String },
    userAgent: { type: String },
    requestUrl: { type: String },
    requestMethod: { type: String },
    data: {
      params: { type: mongoose.Schema.Types.Mixed },
      query: { type: mongoose.Schema.Types.Mixed },
      body: { type: mongoose.Schema.Types.Mixed }
    },
    errorMessage: { type: String }
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actorName: 1 });
auditLogSchema.index({ module: 1, action: 1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);

const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema(
  {
    module: { type: String, required: true },
    action: { type: String, required: true },
    key: { type: String, unique: true, required: true },
    description: { type: String, trim: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },

  { timestamps: true },
);

permissionSchema.index({ sortOrder: 1 });
module.exports = mongoose.model("Permission", permissionSchema);

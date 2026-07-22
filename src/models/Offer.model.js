const mongoose = require('mongoose')

const offerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    image: { type: String, required: true },
    type: { type: String, enum: ["course", "testSeries"], required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: "type" },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Offer", offerSchema);

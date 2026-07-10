const mongoose = require("mongoose");

const editorialSchema = new mongoose.Schema({
  title: { type: String, trim: true },
  slug: { type: String, unique: true, lowercase: true, trim: true },
  type: { type: String, enum: ["daily_editorial", "ncert_based"], index: true },
  bannerImage: { type: String },
  thumbnail: { type: String },
  publishDate: { type: Date, index: true },
  shortDescription: { type: String, default: "" },
  description: { type: String, default: "" },
  videoUrl: { type: String, default: "" },
  editorialTest: { type: mongoose.Schema.Types.ObjectId, ref: "EditorialTest", default: null },
  isFree: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  totalViews: { type: Number, default: 0 },
  totalLikes: { type: Number, default: 0 },
  status: { type: String, enum: ["draft", "published", "inactive"], default: "draft", index: true },
  isDeleted: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" }
}, { timestamps: true });

editorialSchema.index({ type: 1, publishDate: 1, status: 1 });

module.exports = mongoose.model("Editorial", editorialSchema);
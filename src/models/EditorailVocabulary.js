const mongoose = require("mongoose");

const EditorialVocabularySchema = new mongoose.Schema({
  editorailTest: [{ type: mongoose.Schema.Types.ObjectId, ref: "EditorialTest", index: true }],
  title: { type: String, required: true, trim: true },
  word: { type: String, required: true, trim: true },
  pronunciation: { type: String, default: "" },
  audio: { type: String, default: "" },
  thumbnail: { type: String, required: true },
  bannerImage: { type: String, default: "" },
  shortDescription: { type: String, default: "" },
  longDescription: { type: String, default: "" },
  usages: { type: [String], default: [] },
  synonyms: { type: [String], default: [] },
  antonyms: { type: [String], default: [] },
  publishDate: { type: Date, default: Date.now },
  sortOrder: { type: Number, default: 0 },
  status: { type: String, enum: ["draft", "active", "inactive"], default: "draft" },
  isDeleted: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" }
}, { timestamps: true });

EditorialVocabularySchema.index({ type: 1, publishDate: 1 });
EditorialVocabularySchema.index({ title: "text", word: "text", shortDescription: "text" });

module.exports = mongoose.model("EditorialVocabulary", EditorialVocabularySchema);

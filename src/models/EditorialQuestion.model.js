const mongoose = require("mongoose");

const languageSchema = new mongoose.Schema({ text: { type: String, default: "" }, image: { type: String, default: "" } }, { _id: false });

const localizedSchema = { en: languageSchema, hi: languageSchema };

const editorialQuestionSchema = new mongoose.Schema({
  test: { type: mongoose.Schema.Types.ObjectId, ref: "EditorialTest", index: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", index: true },
  question: localizedSchema,
  options: { type: [{ ...localizedSchema }], default: [] },
  correctOption: { type: Number, min: 0, max: 3, default: 0 },
  explanation: localizedSchema,
  sortOrder: { type: Number, default: 1 },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  isDeleted: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" }
}, { timestamps: true });

module.exports = mongoose.model("EditorialQuestion", editorialQuestionSchema);
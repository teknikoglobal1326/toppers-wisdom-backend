const mongoose = require("mongoose");

const editorialTestSchema = new mongoose.Schema({
  title: { type: String, trim: true },
  slug: { type: String, unique: true, lowercase: true, trim: true },
  thumbnailImage: { type: String, default: "" },

  description: { type: String, default: "" },

  instructions: { type: String, default: "" },
  subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: "Subject" }],

  duration: { type: Number, default: 0 }, // Minutes

  totalQuestions: { type: Number, default: 0 },      // Total questions in test
  mappedQuestions: { type: Number, default: 0 },     // Questions added/mapped
  totalMarks: { type: Number, default: 0 },          // Total marks
  passingMarks: { type: Number, default: 0 },        // Passing marks

  isNegativeMarking: { type: Boolean, default: false },
  negativeMarks: { type: Number, default: 0 },       // Per wrong answer

  marksPerQuestion: { type: Number, default: 1 },

  status: {
    type: String,
    enum: ["draft", "published", "inactive"],
    default: "draft",
    index: true
  },

  isFree: { type: Boolean, default: true },

  sortOrder: { type: Number, default: 0 },

  totalAttempts: { type: Number, default: 0 },

  totalViews: { type: Number, default: 0 },

  isDeleted: { type: Boolean, default: false },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin"
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin"
  }

}, { timestamps: true });

module.exports = mongoose.model("EditorialTest", editorialTestSchema);
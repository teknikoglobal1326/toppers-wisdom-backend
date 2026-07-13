const mongoose = require("mongoose");

const optionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      trim: true,
      default: "",
    },
    image: {
      type: String,
      default: "",
    },
    isCorrect: {
      type: Boolean,
      required: true,
    },
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    test: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseTest",
      required: true,
      index: true,
    },

    language: {
      type: String,
      enum: ["en", "hi"],
      required: true,
      default: "en",
    },

    // Links the en/hi versions of the same logical question (dual create shares one groupId).
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },

    question: {
      text: { type: String, required: true, trim: true },
      image: { type: String, default: "" },
    },

    options: {
      type: [optionSchema],
      required: true,
      validate: [
        {
          validator: (v) => Array.isArray(v) && v.length === 4,
          message: "Exactly 4 options are required.",
        },
        {
          validator: (v) => Array.isArray(v) && v.filter((o) => o.isCorrect).length === 1,
          message: "Exactly one correct answer is required.",
        },
        {
          validator: (v) => Array.isArray(v) && v.every((o) => o.text || o.image),
          message: "Each option must have text or image.",
        },
      ],
    },

    explanation: {
      text: { type: String, default: "" },
      image: { type: String, default: "" },
    },

    order: {
      type: Number,
      required: true,
      index: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
      index: true,
    },

    // Time allotted for this question in seconds. Required when the parent test's
    // isPerQuestionTime is true, otherwise stored as null.
    perQuestionTime: {
      type: Number,
      min: 1,
      default: null,
    },

    marks: {
      type: Number,
      default: 1,
      min: 0,
    },

    negativeMarks: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

questionSchema.index({ test: 1, order: 1 });

module.exports = mongoose.model("Question", questionSchema);
const mongoose = require('mongoose')

// Per-language metadata (title/description/instructions). English mirrors the
// top-level fields; Hindi is optional and only populated when provided.
const localizedBlock = {
  title: { type: String, trim: true, default: null },
  description: { type: String, default: null },
  instructions: { type: String, default: null },
}

const courseTestSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject', index: true }],
  topics: [{ type: mongoose.Schema.Types.ObjectId, index: true }],
  chapters: [{ type: mongoose.Schema.Types.ObjectId, index: true }],
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true },
  description: { type: String, default: '' },
  instruction: { type: String, default: '' },
  localizedContent: {
    en: { type: localizedBlock, default: {} },
    hi: { type: localizedBlock, default: null },
  },
  image: { type: String, default: '' },
  duration: { type: Number, required: true }, // in minutes
  isPerQuestionTime: { type: Boolean, default: true }, // when true, each question carries its own perQuestionTime (in seconds)
  sortOrder: { type: Number, default: 0, index: true },
  totalQuestions: { type: Number, default: 0 },
  totalMappedQuestions: { type: Number, default: 0 },
  totalMarks: { type: Number, default: 0 },
  passingMarks: { type: Number, default: 0 },
  marksPerQuestion: { type: Number, default: 1 },
  negativeMarks: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 1 },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  testType: { type: String, enum: ['practice', 'mock', 'exam', 'other'], default: 'other' },
  startDate: { type: Date },
  endDate: { type: Date },
  language: { type: String, enum: ['hi', 'en', 'both'], default: 'hi' },
  status: { type: String, enum: ['draft', 'active', 'inactive', 'other'], default: 'other' },
  isDeleted: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User'}

}, { timestamps: true })

module.exports = mongoose.model('CourseTest', courseTestSchema)

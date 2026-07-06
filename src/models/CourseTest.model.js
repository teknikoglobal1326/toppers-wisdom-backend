const mongoose = require('mongoose')

const courseTestSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  topic: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true, index: true },
  chapter: { type: String, default: '' },
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '' },
  instruction: { type: String, default: '' },
  image: { type: String, default: '' },
  duration: { type: Number, required: true }, // in minutes
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

const mongoose = require('mongoose')

const savedQuestionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
    index: true,
  },
  testType: {
    type: String,
    enum: ['course-test', 'test-series', 'previous-year-paper', 'live-test', 'live_test', 'quiz', 'ai_test', 'math', 'editorial'],
    required: false,
  },
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false,
  },
}, { timestamps: true })

savedQuestionSchema.index({ user: 1, question: 1 }, { unique: true })

module.exports = mongoose.model('SavedQuestion', savedQuestionSchema)

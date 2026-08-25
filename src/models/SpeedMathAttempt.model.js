const mongoose = require('mongoose')

const speedMathAttemptSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  test: { type: mongoose.Schema.Types.ObjectId, ref: 'SpeedMathTest', required: true, index: true },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  answers: [{
    questionId: { type: String, required: true },
    studentAnswer: { type: Number, default: null }, // user selected option's value
    selectedOptionId: { type: String, default: null }, // 'A', 'B', 'C', 'D'
    timeTaken: { type: Number, default: 0 }, // in milliseconds
    isCorrect: { type: Boolean, default: false }
  }],
  score: { type: Number, default: 0 }, // accuracy or correct count percentage
  accuracy: { type: Number, default: 0 },
  questionsPerMinute: { type: Number, default: 0 },
  correct: { type: Number, default: 0 },
  incorrect: { type: Number, default: 0 },
  status: { type: String, enum: ['started', 'completed'], default: 'started' }
}, { timestamps: true })

module.exports = mongoose.model('SpeedMathAttempt', speedMathAttemptSchema)

const mongoose = require('mongoose')

const speedMathTestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  configuration: {
    rangeMin: { type: Number, required: true },
    rangeMax: { type: Number, required: true },
    questionCount: { type: Number, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    operations: [{ type: String, enum: ['addition', 'subtraction', 'multiplication', 'division', 'percentage', 'square', 'cube', 'squareroot', 'cuberoot'] }]
  },
  questions: [{
    questionId: { type: String, required: true },
    questionNumber: { type: Number, required: true },
    operation: { type: String, required: true },
    question: { type: String, required: true },
    options: [{
      id: { type: String, required: true }, // "A", "B", "C", "D"
      value: { type: Number, required: true }
    }],
    correctOptionId: { type: String, required: true },
    explanation: { type: String, required: true },
    difficulty: { type: String, required: true },
    correctAnswer: { type: Number, required: true },
    operands: [{ type: Number }]
  }],
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  isDeleted: { type: Boolean, default: false, index: true }
}, { timestamps: true })

module.exports = mongoose.model('SpeedMathTest', speedMathTestSchema)

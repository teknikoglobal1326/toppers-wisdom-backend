const mongoose = require('mongoose')

const testAttemptSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  test:        { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true, index: true },
  subTestId:   mongoose.Schema.Types.ObjectId,
  answers:     [{ questionId: mongoose.Schema.Types.ObjectId, selectedOption: Number }],
  score:       { type: Number, default: 0 },
  totalMarks:  Number,
  accuracy:    { type: Number, default: 0 },
  timeTaken:   Number,
  rank:        Number,
  sortOrder:   { type: Number, default: 0, index: true },
  correct:     { type: Number, default: 0 },
  wrong:       { type: Number, default: 0 },
  unattempted: { type: Number, default: 0 },
  status:      { type: String, enum: ['completed', 'abandoned'], default: 'completed' },
  attemptedAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true })

module.exports = mongoose.model('TestAttempt', testAttemptSchema)
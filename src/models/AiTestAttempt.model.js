const mongoose = require('mongoose')

const aiTestAttemptSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  aiTest:      { type: mongoose.Schema.Types.ObjectId, ref: 'AiTest', required: true, index: true },
  sessionId:   { type: String, required: true, unique: true, index: true },
  answers: [{
    questionId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    selectedOption: { type: Number, default: null }, // index of option selected (0 to 3)
    status:         { type: String, enum: ['answered', 'skipped', 'visited', 'unattempted'], default: 'unattempted' },
    timeTaken:      { type: Number, default: 0 } // in seconds
  }],
  score:       { type: Number, default: 0 },
  totalMarks:  { type: Number, default: 0 },
  accuracy:    { type: Number, default: 0 }, // percentage
  timeTaken:   { type: Number, default: 0 }, // total time taken in seconds
  correct:     { type: Number, default: 0 },
  wrong:       { type: Number, default: 0 },
  skipped:     { type: Number, default: 0 },
  unattempted: { type: Number, default: 0 },
  status:      { type: String, enum: ['started', 'ongoing', 'completed', 'abandoned'], default: 'started' },
  attemptedAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true })

aiTestAttemptSchema.index({ user: 1, aiTest: 1, attemptedAt: -1 })

module.exports = mongoose.model('AiTestAttempt', aiTestAttemptSchema)

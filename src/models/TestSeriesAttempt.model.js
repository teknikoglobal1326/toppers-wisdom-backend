const mongoose = require('mongoose')

const testSeriesAttemptSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    testSeries: { type: mongoose.Schema.Types.ObjectId, ref: 'TestSeries', required: true, index: true },
    test: { type: mongoose.Schema.Types.ObjectId, ref: 'TestSeriesTest', required: true, index: true },
    sessionId: { type: String, required: true, unique: true, index: true },
    answers: [{ 
      questionId: mongoose.Schema.Types.ObjectId, 
      selectedOption: Number,
      status: { type: String, enum: ['answered', 'skipped', 'visited', 'unattempted'], default: 'unattempted' },
      timeTaken: { type: Number, default: 0 }
    }],
    score: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
    timeTaken: { type: Number, default: 0 },
    totalTime: { type: Number, default: 0 },
    correct: { type: Number, default: 0 },
    wrong: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    unattempted: { type: Number, default: 0 },
    status: { type: String, enum: ['started', 'ongoing', 'completed', 'abandoned'], default: 'started' },
    attemptedAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true })

testSeriesAttemptSchema.index({ user: 1, test: 1, attemptedAt: -1 })

module.exports = mongoose.model('TestSeriesAttempt', testSeriesAttemptSchema)

const mongoose = require('mongoose')

const previousYearPaperAttemptSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    previousYearPaper: { type: mongoose.Schema.Types.ObjectId, ref: 'PreviousYearPaper', required: true, index: true },
    test: { type: mongoose.Schema.Types.ObjectId, ref: 'PreviousYearPaperTest', required: true, index: true },
    answers: [{ questionId: mongoose.Schema.Types.ObjectId, selectedOption: Number }],
    score: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
    timeTaken: { type: Number, default: 0 },
    correct: { type: Number, default: 0 },
    wrong: { type: Number, default: 0 },
    unattempted: { type: Number, default: 0 },
    status: { type: String, enum: ['completed', 'abandoned'], default: 'completed' },
    attemptedAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true })

previousYearPaperAttemptSchema.index({ user: 1, test: 1, attemptedAt: -1 })

module.exports = mongoose.model('PreviousYearPaperAttempt', previousYearPaperAttemptSchema)

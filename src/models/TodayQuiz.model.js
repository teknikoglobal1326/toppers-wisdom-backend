const mongoose = require('mongoose')

const localizedBlock = {
    title: { type: String, trim: true, default: null },
    description: { type: String, default: null },
    instructions: { type: String, default: null },
}

const todayQuizSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    thumbnail: { type: String, default: null },
    duration: { type: Number, required: true, min: 1 },
    totalQuestions: { type: Number, required: true, min: 1 },
    totalMarks: { type: Number, required: true, min: 0 },
    marksPerQuestion: { type: Number, required: true, min: 0 },
    negativeMarks: { type: Number, required: true, min: 0, default: 0 },
    passingMarks: { type: Number, required: true, min: 0 },
    instructions: { type: String, default: null },
    startDateTime: { type: Date, required: true, index: true },
    endDateTime: { type: Date, required: true },
    isPaid: { type: Boolean, default: false, index: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
    language: { type: String, enum: ['en', 'hi', 'both'], default: 'en' },
    localizedContent: {
        en: { type: localizedBlock, default: {} },
        hi: { type: localizedBlock, default: null },
    },
    isDeleted: { type: Boolean, default: false, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
}, { timestamps: true })

module.exports = mongoose.model('TodayQuiz', todayQuizSchema)

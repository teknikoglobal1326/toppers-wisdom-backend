const mongoose = require('mongoose')

const localizedBlock = {
    title: { type: String, trim: true, default: null },
    description: { type: String, default: null },
    instructions: { type: String, default: null },
}

const mathTestSchema = new mongoose.Schema({
    math: { type: mongoose.Schema.Types.ObjectId, ref: 'Math', required: true, index: true },
    subjectIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
    chapterIds: [{ type: mongoose.Schema.Types.ObjectId }],
    topicIds: [{ type: mongoose.Schema.Types.ObjectId }],
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    thumbnail: { type: String, default: null },
    duration: { type: Number, required: true, min: 1 },
    isPerQuestionTime: { type: Boolean, default: true },
    totalQuestions: { type: Number, required: true, min: 1 },
    totalMappedQuestions: { type: Number, default: 0, min: 0 },
    totalMarks: { type: Number, required: true, min: 0 },
    marksPerQuestion: { type: Number, required: true, min: 0 },
    negativeMarks: { type: Number, required: true, min: 0, default: 0 },
    passingMarks: { type: Number, required: true, min: 0 },
    instructions: { type: String, default: null },
    instructionsNew: { type: String, default: null },
    isPaid: { type: Boolean, default: false, index: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
    languages: {
        type: [{ type: String, enum: ['en', 'hi'] }],
        default: ['en'],
        validate: [(v) => Array.isArray(v) && v.length >= 1, 'At least one language is required'],
    },
    localizedContent: {
        en: { type: localizedBlock, default: {} },
        hi: { type: localizedBlock, default: null },
    },
    isDeleted: { type: Boolean, default: false, index: true },
    scheduleAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
}, { timestamps: true })

module.exports = mongoose.model('MathTest', mathTestSchema)

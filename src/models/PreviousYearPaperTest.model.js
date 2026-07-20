const mongoose = require('mongoose')

const localizedBlock = {
    title: { type: String, trim: true, default: null },
    description: { type: String, default: null },
    instructions: { type: String, default: null },
}

const previousYearPaperTestSchema = new mongoose.Schema({
    previousYearPaper: { type: mongoose.Schema.Types.ObjectId, ref: 'PreviousYearPaper', required: true, index: true },
    // Multiple subjects mapped to a test. Chapters/topics below are drawn from these
    // subjects' embedded chapters (Subject.chapters[].topics[]), not the Topic collection.
    subjectIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
    // Embedded chapter ids (Subject.chapters[]._id) chosen across the mapped subjects.
    chapterIds: [{ type: mongoose.Schema.Types.ObjectId }],
    // Embedded topic ids (Subject.chapters[].topics[]._id) chosen across the mapped chapters.
    topicIds: [{ type: mongoose.Schema.Types.ObjectId }],
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    thumbnail: { type: String, default: null },
    duration: { type: Number, required: true, min: 1 },
    isPerQuestionTime: { type: Boolean, default: true }, // when true, each mapped question carries its own perQuestionTime (in seconds)
    totalQuestions: { type: Number, required: true, min: 1 },
    totalMappedQuestions: { type: Number, default: 0, min: 0 },
    totalMarks: { type: Number, required: true, min: 0 },
    marksPerQuestion: { type: Number, required: true, min: 0 },
    negativeMarks: { type: Number, required: true, min: 0, default: 0 },
    passingMarks: { type: Number, required: true, min: 0 },
    instructions: { type: String, default: null },
    isPaid: { type: Boolean, default: false, index: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
    // Languages this test is authored in. ['en'] | ['hi'] | ['en','hi'].
    // Drives which language question forms the admin fills and which language(s)
    // questions may be created in. No 'both' value — both = the array holding both.
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
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
}, { timestamps: true })

module.exports = mongoose.model('PreviousYearPaperTest', previousYearPaperTestSchema)

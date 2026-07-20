const mongoose = require('mongoose')

const previousYearPaperSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    thumbnail: { type: String, default: null },
    exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', default: null },
    subExams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SubExam' }],
    subjectIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
    chapterIds:  [{ type: mongoose.Schema.Types.ObjectId }],
    topicIds:    [{ type: mongoose.Schema.Types.ObjectId }],
    isPaid: { type: Boolean, default: false, index: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
}, { timestamps: true })

module.exports = mongoose.model('PreviousYearPaper', previousYearPaperSchema)

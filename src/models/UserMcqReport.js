const mongoose = require('mongoose');

const McqReportSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['question', 'test', 'testSeries', 'previousYearPaper', 'previousYearTest'], required: true, index: true },
    typeId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    reason: { type: String, enum: ['wrong_answer', 'wrong_question', 'wrong_option', 'translation_issue', 'image_issue', 'technical_issue', 'other'], required: true },
    description: { type: String, trim: true, maxlength: 1000 },
    status: { type: String, enum: ['pending', 'reviewed', 'resolved', 'rejected'], default: 'pending', index: true },
}, { timestamps: true });
McqReportSchema.index({ user: 1, type: 1, typeId: 1, reason: 1, });

module.exports = mongoose.model('McqReport', McqReportSchema);
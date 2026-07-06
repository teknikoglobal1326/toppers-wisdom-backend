const mongoose = require('mongoose')

const subExamSchema = new mongoose.Schema({
  name:             { type: String, required: true, trim: true },
  hiName:           { type: String, trim: true },
  enName:           { type: String, trim: true },
  shortDescription: { type: String, trim: true, default: null },
  examId:           { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
  language:         { type: String, enum: ['hi', 'en', 'both'], default: 'both', index: true },
  status:           { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  is_deleted:       { type: Boolean, default: false, index: true },
}, { timestamps: true })

module.exports = mongoose.model('SubExam', subExamSchema)

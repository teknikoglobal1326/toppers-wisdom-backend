const mongoose = require('mongoose')

const CalendarExamSchema = new mongoose.Schema({
  exams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Exam', index: true }],
  subExams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SubExam', index: true }],
  title: { type: String, required: true, trim: true },
  image: { type: String, default: null },
  publishDate: { type: Date, default: Date.now },
  sortOrder: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  isDeleted: { type: Boolean, default: false, index: true }
}, { timestamps: true })

module.exports = mongoose.model('CalendarExam', CalendarExamSchema)

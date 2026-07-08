const mongoose = require('mongoose')

const shortSchema = new mongoose.Schema({
  title:     { type: String, required: true, trim: true },
  hiTitle:   { type: String, trim: true },
  enTitle:   { type: String, trim: true },
  videoUrl:  { type: String, default: null },
  thumbnail: { type: String, default: null },
  sortOrder: { type: Number, default: 0, index: true },
  examId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', default: null, index: true },
  subexamId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubExam', default: null, index: true },
  language:  { type: String, enum: ['hi', 'en', 'both'], default: 'both', index: true },
  status:    { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  isDeleted: { type: Boolean, default: false, index: true },
}, { timestamps: true })

module.exports = mongoose.model('Short', shortSchema)

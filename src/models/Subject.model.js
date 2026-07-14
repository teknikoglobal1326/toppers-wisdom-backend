const mongoose = require('mongoose')

const chapterSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true })

const topicSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  sortOrder: { type: Number, default: 0 },
  chapters:  { type: [chapterSchema], default: [] },
}, { timestamps: true })

const subjectSchema = new mongoose.Schema({
  subExamId:  { type: mongoose.Schema.Types.ObjectId, ref: 'SubExam', required: true, index: true },
  name:       { type: String, required: true, trim: true },
  sortOrder:  { type: Number, default: 0, index: true },
  language:   { type: String, enum: ['hi', 'en'], default: 'en', index: true },
  status:     { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  topics:     { type: [topicSchema], default: [] },
  isDeleted:  { type: Boolean, default: false, index: true },
}, { timestamps: true })

module.exports = mongoose.model('Subject', subjectSchema)
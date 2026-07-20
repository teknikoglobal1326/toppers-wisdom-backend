const mongoose = require('mongoose')

const topicSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true })

const chapterSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  sortOrder: { type: Number, default: 0 },
  topics:    { type: [topicSchema], default: [] },
}, { timestamps: true })

const subjectSchema = new mongoose.Schema({
  examIds:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Exam', index: true }],
  subExamIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SubExam', index: true }],
  name:       { type: String, required: true, trim: true },
  sortOrder:  { type: Number, default: 0, index: true },
  language:   { type: String, enum: ['hi', 'en'], default: 'en', index: true },
  status:     { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  chapters:   { type: [chapterSchema], default: [] },
  isDeleted:  { type: Boolean, default: false, index: true },
}, { timestamps: true })

module.exports = mongoose.model('Subject', subjectSchema)

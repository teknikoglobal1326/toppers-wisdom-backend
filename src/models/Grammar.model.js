const mongoose = require('mongoose')

const chapterSchema = new mongoose.Schema({
  chapterName: { type: String, required: true, trim: true },
  content:     { type: String, default: '' },
  fileUrl:     { type: String, default: '' },
  sortOrder:   { type: Number, default: 0, index: true },
  totalLikes: {type: Number, default: 0, index: true },
}, { _id: true })

const grammarSchema = new mongoose.Schema({
  title:      { type: String, required: true, trim: true },
  topicName:  { type: String, required: true, trim: true },
  chapters:   { type: [chapterSchema], default: [] },
  sortOrder:  { type: Number, default: 0, index: true },
  status:     { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  exam:       { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', default: null, index: true },
  subjectIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
  isDeleted:  { type: Boolean, default: false, index: true }
}, { timestamps: true })

module.exports = mongoose.model('Grammar', grammarSchema)
const mongoose = require('mongoose')

const bannerSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  image:      { type: String, default: null },
  sortOrder:  { type: Number, default: 0, index: true },
  examId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', default: null, index: true },
  subexamId:  { type: mongoose.Schema.Types.ObjectId, ref: 'SubExam', default: null, index: true },
  type:       { type: String, enum: ['external', 'subscription', 'course'], required: true, default: 'external' },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', default: null, index: true },
  courseId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null, index: true },
  url:        { type: String, default: null },
  language:   { type: String, enum: ['hi', 'en', 'both'], default: 'both', index: true },
  status:     { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  isDeleted:  { type: Boolean, default: false, index: true },
}, { timestamps: true })

module.exports = mongoose.model('Banner', bannerSchema)

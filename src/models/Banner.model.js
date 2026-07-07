const mongoose = require('mongoose')

const bannerSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  image:      { type: String, default: null },
  examId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', default: null, index: true },
  subexamId:  { type: mongoose.Schema.Types.ObjectId, ref: 'SubExam', default: null, index: true },
  language:   { type: String, enum: ['hi', 'en', 'both'], default: 'both', index: true },
  status:     { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  isDeleted:  { type: Boolean, default: false, index: true },
}, { timestamps: true })

module.exports = mongoose.model('Banner', bannerSchema)

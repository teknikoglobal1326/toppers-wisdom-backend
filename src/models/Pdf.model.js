const mongoose = require('mongoose')

const pdfSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  topic: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  pdfFile: { type: String, required: true },
  image: { type: String, default: '' },
//   instruction: { type: String, default: '' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  isDeleted: { type: Boolean, default: false, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true })

module.exports = mongoose.model('Pdf', pdfSchema)
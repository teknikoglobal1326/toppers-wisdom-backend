const mongoose = require('mongoose')

const faqSchema = new mongoose.Schema({
  question:   { type: String, required: true, trim: true },
  answer:     { type: String, required: true, trim: true },
  sortOrder:  { type: Number, default: 0, index: true },
  status:     { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  isDeleted:  { type: Boolean, default: false, index: true }
}, { timestamps: true })

module.exports = mongoose.model('Faq', faqSchema)
const mongoose = require('mongoose')

const subjectSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  hiName:     { type: String, trim: true },
  enName:     { type: String, trim: true },
  language:   { type: String, enum: ['hi', 'en', 'both'], default: 'both', index: true },
  status:     { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  isDeleted:  { type: Boolean, default: false, index: true },
}, { timestamps: true })

module.exports = mongoose.model('Subject', subjectSchema)

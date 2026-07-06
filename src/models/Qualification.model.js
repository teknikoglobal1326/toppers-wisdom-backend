const mongoose = require('mongoose')
const s = new mongoose.Schema({
  name: { type: String, required: true }, 
  hiName: { type: String, trim: true },
  enName: { type: String, trim: true },
  slug: { type: String, required: true, unique: true },
  language: { type: String, enum: ['hi', 'en', 'both'], default: 'both', index: true },
  isActive: { type: Boolean, default: true }, 
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true })
module.exports = mongoose.model('Qualification', s)

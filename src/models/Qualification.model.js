const mongoose = require('mongoose')
const s = new mongoose.Schema({
  name: { type: String, required: true }, slug: { type: String, required: true, unique: true },
  isActive: { type: Boolean, default: true }, sortOrder: { type: Number, default: 0 },
}, { timestamps: true })
module.exports = mongoose.model('Qualification', s)
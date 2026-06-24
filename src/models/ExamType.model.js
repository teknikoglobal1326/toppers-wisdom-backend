const mongoose = require('mongoose')
const s = new mongoose.Schema({
  qualification: { type: mongoose.Schema.Types.ObjectId, ref: 'Qualification', required: true, index: true },
  name: { type: String, required: true }, slug: { type: String, required: true, unique: true },
  icon: String, isActive: { type: Boolean, default: true }, sortOrder: { type: Number, default: 0 },
}, { timestamps: true })
module.exports = mongoose.model('ExamType', s)
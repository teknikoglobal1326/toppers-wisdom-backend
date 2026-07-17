const mongoose = require('mongoose')

const shortCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  bannerImage: { type: String, default: null },
  logo: { type: String, default: null },
  tags: { type: [String], default: [] },
  examIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Exam', default: [] }],
  status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  isDeleted: { type: Boolean, default: false, index: true },
}, { timestamps: true })

module.exports = mongoose.model('ShortCategory', shortCategorySchema)

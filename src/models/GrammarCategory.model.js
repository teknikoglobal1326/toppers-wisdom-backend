const mongoose = require('mongoose')

const GrammarCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  sortOrder: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  isDeleted: { type: Boolean, default: false, index: true },
}, { timestamps: true })

module.exports = mongoose.model('GrammarCategory', GrammarCategorySchema)

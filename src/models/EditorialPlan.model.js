const mongoose = require('mongoose')

const editorialPlanSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: null },
  price: { type: Number, default: 0 },
  discountPrice: { type: Number, default: 0 },
  validityInMonths: { type: Number, default: 12 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true }
}, { timestamps: true })

module.exports = mongoose.model('EditorialPlan', editorialPlanSchema)

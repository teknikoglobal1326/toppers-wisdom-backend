const mongoose = require('mongoose')

const leadSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  purposeType: { type: String, enum: ['course', 'subscription'], required: true, index: true },
  subType: { type: String, enum: ['course', 'test-series', 'previous-year-paper'], required: true },
  visitType: { type: String, enum: ['detail', 'checkout', 'contentCheckout'], required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  timestamp: { type: Date, default: Date.now },
  isRead: { type: Boolean, default: false, index: true }
}, { timestamps: true })

module.exports = mongoose.model('Lead', leadSchema)

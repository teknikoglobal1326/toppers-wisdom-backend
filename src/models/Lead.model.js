const mongoose = require('mongoose')

const leadSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  purposeType: { type: String, enum: ['course', 'subscription', 'banner', 'general', 'onboarding'], default: 'general', index: true },
  subType: { type: String, enum: ['course', 'test-series', 'previous-year-paper', 'subscription', 'banner', 'general', 'onboarding'], default: 'general' },
  visitType: { type: String, enum: ['onboarding', 'detail', 'checkout', 'contentCheckout', 'payment_failed', 'banner'], required: true, index: true },
  leadStatus: { type: String, enum: ['hot', 'warm', 'cold'], index: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, default: null },
  itemName: { type: String, default: null },
  amount: { type: Number, default: 0 },
  paymentError: { type: String, default: null },
  timestamp: { type: Date, default: Date.now },
  isRead: { type: Boolean, default: false, index: true }
}, { timestamps: true })

leadSchema.pre('save', function (next) {
  if (!this.leadStatus) {
    const vt = (this.visitType || '').toLowerCase()
    if (vt === 'payment_failed' || vt === 'paymentfailed') {
      this.leadStatus = 'hot'
    } else if (vt === 'detail' || vt === 'checkout' || vt === 'contentcheckout' || vt === 'banner') {
      this.leadStatus = 'warm'
    } else {
      this.leadStatus = 'cold'
    }
  }
  next()
})

module.exports = mongoose.model('Lead', leadSchema)

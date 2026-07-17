const mongoose = require('mongoose')

const userSubscriptionSchema = new mongoose.Schema({
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true, index: true },
  order:        { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionOrder' },
  startDate:    { type: Date, required: true },
  endDate:      { type: Date, required: true },
  isActive:     { type: Boolean, default: true, index: true },
}, { timestamps: true })

userSubscriptionSchema.index({ user: 1, subscription: 1 })

module.exports = mongoose.model('UserSubscription', userSubscriptionSchema)

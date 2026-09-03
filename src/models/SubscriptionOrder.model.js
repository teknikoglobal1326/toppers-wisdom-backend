/* eslint-disable no-console */
const mongoose = require('mongoose')

const subscriptionOrderSchema = new mongoose.Schema({
  user:              { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subscription:      { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true },
  amount:            { type: Number, required: true },
  currency:          { type: String, default: 'INR' },
  status:            { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending', index: true },
  duration:          { type: Number },
  isActive:          { type: Boolean, default: true, index: true },
  couponApplied: {
    couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
    code: String,
    discountValue: Number,
    discountType: String,
    discountAmount: Number
  },
  subscriptionDetails: { type: mongoose.Schema.Types.Mixed },
  razorpayOrderId:   { type: String, index: true },
  razorpayPaymentId: String,
  razorpaySignature: String,
  paidAt:            Date,
}, { timestamps: true })

module.exports = mongoose.model('SubscriptionOrder', subscriptionOrderSchema)

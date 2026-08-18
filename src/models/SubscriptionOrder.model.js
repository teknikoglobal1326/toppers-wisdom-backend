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
  subscriptionDetails: { type: mongoose.Schema.Types.Mixed },
  razorpayOrderId:   { type: String, index: true },
  razorpayPaymentId: String,
  razorpaySignature: String,
  paidAt:            Date,
}, { timestamps: true })

subscriptionOrderSchema.pre('save', async function (next) {
  if (this.isNew) {
    if (!this.duration || !this.subscriptionDetails) {
      try {
        const Subscription = mongoose.model('Subscription');
        const subscription = await Subscription.findById(this.subscription);
        if (subscription) {
          if (!this.duration) {
            this.duration = subscription.durationDays;
          }
          this.isActive = subscription.isActive !== undefined ? subscription.isActive : true;
          if (!this.subscriptionDetails) {
            const details = subscription.toObject();
            details.duration = subscription.durationDays;
            details.price = subscription.price;
            this.subscriptionDetails = details;
          }
        } 
      } catch (err) {
        return next(err);
      }
    }
  }
  next();
});

module.exports = mongoose.model('SubscriptionOrder', subscriptionOrderSchema)

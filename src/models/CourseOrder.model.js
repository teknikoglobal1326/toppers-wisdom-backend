const mongoose = require('mongoose')

const courseOrderSchema = new mongoose.Schema({
  user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  items: [{
    itemType: { type: String, enum: ['course', 'test', 'booster'], required: true },
    itemId:   { type: mongoose.Schema.Types.ObjectId, required: true },
    title: String, price: Number, validityInMonths: Number, isLifetime: Boolean,
  }],
  totalAmount:       { type: Number, required: true },
  discount:          { type: Number, default: 0 },
  gstRate:           { type: Number, default: 0 },
  gstAmount:         { type: Number, default: 0 },
  grandTotal:        { type: Number, required: true },
  currency:          { type: String, default: 'INR' },
  status:            { type: String, enum: ['pending','paid','failed','refunded'], default: 'pending', index: true },
  razorpayOrderId:   { type: String, index: true },
  razorpayPaymentId: String,
  razorpaySignature: String,
  paidAt:            Date,
}, { timestamps: true })

module.exports = mongoose.model('CourseOrder', courseOrderSchema)
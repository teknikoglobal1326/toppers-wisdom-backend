const mongoose = require('mongoose')

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
  discountType: { type: String, enum: ['percentage', 'flat'], required: true, default: 'percentage' },
  discountValue: { type: Number, required: true },
  maxDiscount: { type: Number, default: null }, // maximum discount amount if percentage type
  minOrderAmount: { type: Number, default: 0 }, // minimum order amount required to apply coupon
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  usageLimit: { type: Number, default: null }, // total usage limit across all users
  usageCount: { type: Number, default: 0 },
  userLimit: { type: Number, default: 1 }, // limit per individual user
  status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  description: { type: String, default: '' },
  isDeleted: { type: Boolean, default: false, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, { timestamps: true })

module.exports = mongoose.model('Coupon', couponSchema)

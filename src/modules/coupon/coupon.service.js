const BaseService = require('../../core/BaseService')
const couponRepository = require('./coupon.repository')
const AppError = require('../../core/AppError')
const Coupon = require('../../models/Coupon.model')
const CourseOrder = require('../../models/CourseOrder.model')
const SubscriptionOrder = require('../../models/SubscriptionOrder.model')

class CouponService extends BaseService {
  constructor() {
    super(couponRepository, 'coupon')
  }

  async getActiveCoupons() {
    const now = new Date()
    return await Coupon.find({
      status: 'active',
      isDeleted: false,
      $and: [
        { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
        { $or: [{ endDate: null }, { endDate: { $gte: now } }] }
      ],
      $expr: {
        $or: [
          { $eq: ["$usageLimit", null] },
          { $lt: ["$usageCount", "$usageLimit"] }
        ]
      }
    }).select('-createdBy -updatedBy -createdAt -updatedAt -__v').lean()
  }

  async validateAndCalculateDiscount(couponCode, userId, originalAmount) {
    if (!couponCode) return { isValid: false, discountAmount: 0 }
    const now = new Date()

    const coupon = await Coupon.findOne({
      code: couponCode.toUpperCase(),
      status: 'active',
      isDeleted: false
    })

    if (!coupon) throw new AppError('Invalid or inactive coupon code', 400)

    if (coupon.startDate && coupon.startDate > now) {
      throw new AppError('Coupon is not yet active', 400)
    }

    if (coupon.endDate && coupon.endDate < now) {
      throw new AppError('Coupon has expired', 400)
    }

    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      throw new AppError('Coupon usage limit reached', 400)
    }

    if (coupon.minOrderAmount && originalAmount < coupon.minOrderAmount) {
      throw new AppError(`Minimum order amount of ${coupon.minOrderAmount} required for this coupon`, 400)
    }

    // Check user limit
    if (coupon.userLimit) {
      const courseOrderCount = await CourseOrder.countDocuments({ user: userId, 'couponApplied.code': coupon.code, status: { $ne: 'failed' } })
      const subOrderCount = await SubscriptionOrder.countDocuments({ user: userId, 'couponApplied.code': coupon.code, status: { $ne: 'failed' } })
      const totalUserUsage = courseOrderCount + subOrderCount

      if (totalUserUsage >= coupon.userLimit) {
        throw new AppError(`You have already used this coupon ${totalUserUsage} times (limit: ${coupon.userLimit})`, 400)
      }
    }

    let discountAmount = 0
    if (coupon.discountType === 'percentage') {
      discountAmount = (originalAmount * coupon.discountValue) / 100
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount
      }
    } else if (coupon.discountType === 'flat') {
      discountAmount = coupon.discountValue
    }

    // Discount cannot exceed original amount
    if (discountAmount > originalAmount) {
      discountAmount = originalAmount
    }

    // Round discount to 2 decimal places
    discountAmount = Math.round(discountAmount * 100) / 100

    const couponApplied = {
      couponId: coupon._id,
      code: coupon.code,
      discountValue: coupon.discountValue,
      discountType: coupon.discountType,
      discountAmount
    }

    return { isValid: true, discountAmount, couponApplied, coupon }
  }
}

module.exports = new CouponService()

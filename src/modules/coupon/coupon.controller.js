const catchAsync = require('../../core/catchAsync')
const { sendSuccess } = require('../../core/response')
const couponService = require('./coupon.service')

const getActiveCoupons = catchAsync(async (req, res) => {
  const coupons = await couponService.getActiveCoupons()
  sendSuccess(res, coupons, 'Active coupons retrieved successfully')
})

module.exports = { getActiveCoupons }

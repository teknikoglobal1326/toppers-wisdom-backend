const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const adminCouponService = require('./admin-coupon.service')

const list = catchAsync(async (req, res) => {
  const result = await adminCouponService.listAll(req.query)
  sendPaginated(res, result.data, result.pagination)
})

const getOne = catchAsync(async (req, res) => {
  const coupon = await adminCouponService.getOne(req.params.id)
  sendSuccess(res, coupon)
})

const create = catchAsync(async (req, res) => {
  const coupon = await adminCouponService.createCoupon(req.body, req.user._id)
  sendCreated(res, coupon, 'Coupon created successfully')
})

const update = catchAsync(async (req, res) => {
  const coupon = await adminCouponService.updateCoupon(req.params.id, req.body, req.user._id)
  sendSuccess(res, coupon, 'Coupon updated successfully')
})

const remove = catchAsync(async (req, res) => {
  await adminCouponService.softDelete(req.params.id, req.user._id)
  sendSuccess(res, null, 'Coupon deleted successfully')
})

module.exports = { list, getOne, create, update, remove }

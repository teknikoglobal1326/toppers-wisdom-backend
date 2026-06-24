const catchAsync = require('../../core/catchAsync')
const { sendSuccess } = require('../../core/response')
const paymentService = require('./payment.service')

const createOrder = catchAsync(async (req, res) => {
  sendSuccess(res, await paymentService.createOrder(req.user._id, req.body.items), 'Order created', 201)
})

const verifyPayment = catchAsync(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body
  sendSuccess(res, await paymentService.verifyPayment(req.user._id, razorpayOrderId, razorpayPaymentId, razorpaySignature), 'Payment verified')
})

const webhook = catchAsync(async (req, res) => {
  await paymentService.handleWebhook(req.body, req.headers['x-razorpay-signature'])
  res.json({ received: true })
})

module.exports = { createOrder, verifyPayment, webhook }
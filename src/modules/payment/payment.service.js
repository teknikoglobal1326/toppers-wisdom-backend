const BaseService = require('../../core/BaseService')
const paymentRepository = require('./payment.repository')
const crypto = require('crypto')
const Razorpay = require('razorpay')
const AppError = require('../../core/AppError')
const config = require('../../config/env')
const { createLogger } = require('../../config/logger')

const razorpay = new Razorpay({ key_id: config.RAZORPAY_KEY_ID, key_secret: config.RAZORPAY_KEY_SECRET })

class PaymentService extends BaseService {
  constructor() {
    super(paymentRepository, 'payment')
    this.logger = createLogger('payment:service')
  }

  async createOrder(userId, items, metadata = {}) {
    this.logger.info({ userId, itemCount: items.length }, 'Creating order')

    const totalAmount = metadata.totalAmount ?? items.reduce((sum, i) => sum + i.price, 0)
    const grandTotal = metadata.grandTotal ?? totalAmount

    const rzpOrder = await razorpay.orders.create({
      amount: Math.round(grandTotal * 100), currency: 'INR', receipt: `receipt_${Date.now()}`,
    })

    const orderData = {
      user: userId,
      items,
      totalAmount,
      discount: metadata.discount || 0,
      gstRate: metadata.gstRate || 0,
      gstAmount: metadata.gstAmount || 0,
      grandTotal,
      currency: 'INR',
      razorpayOrderId: rzpOrder.id,
      status: 'pending'
    }

    const order = await this.create(orderData)
    this.logger.info({ userId, orderId: order._id, grandTotal }, 'Order created')
    return { orderId: order._id, razorpayOrderId: rzpOrder.id, amount: grandTotal, currency: 'INR', keyId: config.RAZORPAY_KEY_ID }
  }

  async verifyPayment(userId, razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    this.logger.info({ userId, razorpayOrderId }, 'Verifying payment')

    const expectedSig = crypto
      .createHmac('sha256', config.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex')

    if (expectedSig !== razorpaySignature) {
      this.logger.warn({ userId, razorpayOrderId }, 'Signature mismatch')
      throw new AppError('Invalid payment signature', 400, 'PAYMENT_INVALID')
    }

    const order = await paymentRepository.findByRazorpayOrderId(razorpayOrderId)
    if (!order) throw new AppError('Order not found', 404)
    if (order.status === 'paid') throw new AppError('Payment already processed', 409)

    // inherited: this.update() → BaseRepository.updateById()
    const updated = await this.update(order._id, { status: 'paid', razorpayPaymentId, razorpaySignature, paidAt: new Date() })

    const courseItems = order.items.filter((i) => i.itemType === 'course')
    await paymentRepository.createEnrollmentsForOrder(userId, courseItems)

    const { notificationQueue, emailQueue } = require('../../jobs/queue')
    await Promise.all([
      notificationQueue.add('payment-success', { userId, orderId: order._id, amount: order.totalAmount }),
      emailQueue.add('payment-receipt', { userId, orderId: order._id }),
    ])

    this.logger.info({ userId, orderId: order._id }, 'Payment verified — access granted')
    return { success: true, order: updated }
  }

  async handleWebhook(body, signature) {
    const expected = crypto.createHmac('sha256', config.RAZORPAY_KEY_SECRET).update(JSON.stringify(body)).digest('hex')
    if (expected !== signature) throw new AppError('Invalid webhook signature', 400)

    if (body.event === 'payment.failed') {
      const { order_id } = body.payload.payment.entity
      await paymentRepository.updateOne({ razorpayOrderId: order_id }, { status: 'failed' })
      this.logger.warn({ razorpayOrderId: order_id }, 'Payment failed')
    }
  }
}

module.exports = new PaymentService()
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

    let totalAmount = metadata.totalAmount ?? items.reduce((sum, i) => sum + i.price, 0)
    let grandTotal = metadata.grandTotal ?? totalAmount
    let discount = metadata.discount || 0
    let appliedCoupon = null

    if (metadata.couponCode) {
      const couponService = require('../coupon/coupon.service')
      const validation = await couponService.validateAndCalculateDiscount(metadata.couponCode, userId, totalAmount)
      if (validation.isValid) {
        discount = validation.discountAmount
        grandTotal = totalAmount - discount
        appliedCoupon = validation.couponApplied
      }
    }

    let rzpOrder = null
    let status = 'pending'
    let paidAt = null

    if (grandTotal > 0) {
      rzpOrder = await razorpay.orders.create({
        amount: Math.round(grandTotal * 100), currency: 'INR', receipt: `receipt_${Date.now()}`,
      })
    } else {
      status = 'paid'
      paidAt = new Date()
    }

    const orderData = {
      user: userId,
      items,
      totalAmount,
      discount,
      gstRate: metadata.gstRate || 0,
      gstAmount: metadata.gstAmount || 0,
      grandTotal,
      currency: 'INR',
      razorpayOrderId: rzpOrder ? rzpOrder.id : null,
      status,
      paidAt,
      couponApplied: appliedCoupon
    }

    const order = await this.create(orderData)
    this.logger.info({ userId, orderId: order._id, grandTotal }, 'Order created')

    if (status === 'paid') {
      const courseItems = order.items.filter((i) => i.itemType === 'course')
      await paymentRepository.createEnrollmentsForOrder(userId, courseItems)
      const courseRepository = require('../course/course.repository')
      for (const item of courseItems) {
        await courseRepository.incrementEnrollments(item.itemId)
      }

      if (order.couponApplied && order.couponApplied.code) {
        const Coupon = require('../../models/Coupon.model')
        await Coupon.updateOne({ code: order.couponApplied.code }, { $inc: { usageCount: 1 } })
      }

      const { notificationQueue, emailQueue } = require('../../jobs/queue')
      await Promise.all([
        notificationQueue.add('payment-success', { userId, orderId: order._id, amount: order.totalAmount }),
        emailQueue.add('payment-receipt', { userId, orderId: order._id }),
      ]).catch(err => this.logger.error({ err }, 'Failed to queue notifications for free purchase'))
    }

    return {
      orderId: order._id,
      razorpayOrderId: rzpOrder ? rzpOrder.id : null,
      amount: grandTotal,
      currency: 'INR',
      keyId: rzpOrder ? config.RAZORPAY_KEY_ID : null,
      status,
      payment_status: status === 'paid' ? 'success' : 'pending'
    }
  }

  // async verifyPayment(userId, razorpayOrderId, razorpayPaymentId, razorpaySignature) {
  //   this.logger.info({ userId, razorpayOrderId }, 'Verifying payment')

  //   const expectedSig = crypto
  //     .createHmac('sha256', config.RAZORPAY_KEY_SECRET)
  //     .update(`${razorpayOrderId}|${razorpayPaymentId}`)
  //     .digest('hex')

  //   if (expectedSig !== razorpaySignature) {
  //     this.logger.warn({ userId, razorpayOrderId }, 'Signature mismatch')
  //     throw new AppError('Invalid payment signature', 400, 'PAYMENT_INVALID')
  //   }

  //   const order = await paymentRepository.findByRazorpayOrderId(razorpayOrderId)
  //   if (!order) throw new AppError('Order not found', 404)
  //   if (order.status === 'paid') throw new AppError('Payment already processed', 409)

  //   // inherited: this.update() → BaseRepository.updateById()
  //   const updated = await this.update(order._id, { status: 'paid', razorpayPaymentId, razorpaySignature, paidAt: new Date() })

  //   const courseItems = order.items.filter((i) => i.itemType === 'course')
  //   await paymentRepository.createEnrollmentsForOrder(userId, courseItems)
  //   const courseRepository = require('../course/course.repository')
  //   for (const item of courseItems) {
  //     await courseRepository.incrementEnrollments(item.itemId)
  //   }

  //   if (order.couponApplied && order.couponApplied.code) {
  //     const Coupon = require('../../models/Coupon.model')
  //     await Coupon.updateOne({ code: order.couponApplied.code }, { $inc: { usageCount: 1 } })
  //   }

  //   const { notificationQueue, emailQueue } = require('../../jobs/queue')
  //   await Promise.all([
  //     notificationQueue.add('payment-success', { userId, orderId: order._id, amount: order.totalAmount }),
  //     emailQueue.add('payment-receipt', { userId, orderId: order._id }),
  //   ])

  //   this.logger.info({ userId, orderId: order._id }, 'Payment verified — access granted')
  //   return { success: true, order: updated }
  // }

  async verifyPayment(
  userId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature
) {
  try {
    this.logger.info(
      {
        userId,
        razorpayOrderId,
        razorpayPaymentId
      },
      'Verifying payment'
    )

    const expectedSig = crypto
      .createHmac('sha256', config.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex')

    if (expectedSig !== razorpaySignature) {
      this.logger.warn(
        { userId, razorpayOrderId },
        'Signature mismatch'
      )

      throw new AppError(
        'Invalid payment signature',
        400,
        'PAYMENT_INVALID'
      )
    }

    this.logger.info(
      { razorpayOrderId },
      'Payment signature verified'
    )

    const order =
      await paymentRepository.findByRazorpayOrderId(razorpayOrderId)

    if (!order) {
      throw new AppError('Order not found', 404)
    }

    this.logger.info(
      {
        orderId: order._id,
        status: order.status
      },
      'Payment order found'
    )

    if (order.status === 'paid') {
      throw new AppError(
        'Payment already processed',
        409
      )
    }

    const updated = await this.update(order._id, {
      status: 'paid',
      razorpayPaymentId,
      razorpaySignature,
      paidAt: new Date()
    })

    this.logger.info(
      { orderId: order._id },
      'Order marked as paid'
    )

    const courseItems = order.items.filter(
      (i) => i.itemType === 'course'
    )

    this.logger.info(
      {
        orderId: order._id,
        courseCount: courseItems.length
      },
      'Creating enrollments'
    )

    await paymentRepository.createEnrollmentsForOrder(
      userId,
      courseItems
    )

    const courseRepository =
      require('../course/course.repository')

    for (const item of courseItems) {
      await courseRepository.incrementEnrollments(
        item.itemId
      )
    }

    if (
      order.couponApplied &&
      order.couponApplied.code
    ) {
      const Coupon =
        require('../../models/Coupon.model')

      await Coupon.updateOne(
        { code: order.couponApplied.code },
        { $inc: { usageCount: 1 } }
      )
    }

    const { notificationQueue, emailQueue } =
      require('../../jobs/queue')

    try {
      await Promise.all([
        notificationQueue.add('payment-success', {
          userId,
          orderId: order._id,
          amount: order.totalAmount
        }),
        emailQueue.add('payment-receipt', {
          userId,
          orderId: order._id
        })
      ])
    } catch (queueError) {
      this.logger.error(
        {
          err: queueError,
          userId,
          orderId: order._id
        },
        'Failed to queue payment notifications'
      )
    }

    this.logger.info(
      {
        userId,
        orderId: order._id
      },
      'Payment verified — access granted'
    )

    return {
      success: true,
      order: updated
    }
  } catch (error) {
    this.logger.error(
    {
      err: error,
      userId,
      razorpayOrderId,
      razorpayPaymentId,
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
      statusCode: error?.statusCode,
      response: error?.response?.data,
    },
    'verifyPayment FAILED'
  )

  try {
    const Order = require('../../models/Order.model')
    const Lead = require('../../models/Lead.model')
    if (razorpayOrderId) {
      const orderData = await Order.findOne({ razorpayOrderId })
      if (orderData) {
        const firstItem = orderData.items?.[0]
        if (firstItem && firstItem.itemId) {
          const lead = await Lead.findOne({ user: userId, itemId: firstItem.itemId })
          if (lead) {
            lead.leadStatus = 'hot'
            lead.visitType = 'paymentFailed'
            await lead.save()
          }
        }
      }
    }
  } catch (leadUpdateError) {
    this.logger.error({ err: leadUpdateError, userId, razorpayOrderId }, 'Failed to update lead on payment verify failure')
  }

  throw error
  }
}


  async handleWebhook(body, signature) {
    const expected = crypto.createHmac('sha256', config.RAZORPAY_KEY_SECRET).update(JSON.stringify(body)).digest('hex')
    if (expected !== signature) throw new AppError('Invalid webhook signature', 400)

    if (body.event === 'payment.failed') {
      const { order_id } = body.payload.payment.entity
      await paymentRepository.updateOne({ razorpayOrderId: order_id }, { status: 'failed' })
            this.logger.warn({ razorpayOrderId: order_id }, 'Payment failed')
      try {
        const Order = require('../../models/Order.model')
        const Lead = require('../../models/Lead.model')
        const order = await Order.findOne({ razorpayOrderId: order_id })
        if (order) {
          const firstItem = order.items?.[0]
          await Lead.create({
            user: order.user,
            purposeType: firstItem?.itemType === 'subscription' ? 'subscription' : 'course',
            subType: firstItem?.itemType || 'course',
            visitType: 'payment_failed',
            leadStatus: 'hot',
            itemId: firstItem?.itemId || null,
            itemName: firstItem?.name || null,
            amount: order.finalAmount || order.totalAmount,
            paymentError: 'Payment failed'
          })
        }
      } catch (leadFailErr) {
        this.logger.error({ err: leadFailErr }, 'Failed to create payment_failed lead')
      }
    }
  }

  async handlePaymentFailure(userId, payload = {}) {
    this.logger.warn({ userId, payload }, 'Handling payment failure / cancellation from app')
    const Lead = require('../../models/Lead.model')
    const Order = require('../../models/Order.model')
    const Course = require('../../models/Course.model')
    const Subscription = require('../../models/Subscription.model')

    const { orderId, razorpayOrderId, courseId, subscriptionId, error, reason } = payload

    let order = null
    if (orderId) {
      order = await Order.findById(orderId)
    } else if (razorpayOrderId) {
      order = await Order.findOne({ razorpayOrderId })
    }

    if (order) {
      await paymentRepository.updateOne({ _id: order._id }, { status: 'failed' })
    }

    let purposeType = 'course'
    let subType = 'course'
    let itemId = courseId || null
    let itemName = null
    let amount = order ? (order.grandTotal || order.totalAmount) : 0

    if (subscriptionId || (order && order.subscription)) {
      purposeType = 'subscription'
      subType = 'subscription'
      itemId = subscriptionId || order?.subscription
      const sub = await Subscription.findById(itemId).lean()
      if (sub) {
        itemName = sub.name
        if (!amount) amount = sub.price
      }
    } else if (itemId || (order && order.items && order.items.length > 0)) {
      const firstItem = order?.items?.[0]
      if (firstItem) {
        itemId = itemId || firstItem.itemId
        purposeType = firstItem.itemType || 'course'
        subType = firstItem.itemType || 'course'
        itemName = firstItem.name
      } else if (itemId) {
        const course = await Course.findById(itemId).lean()
        if (course) {
          itemName = course.title || course.name
          if (!amount) amount = course.price
        }
      }
    }

    const failureReason = error || reason || 'Payment cancelled by user / failed at gateway'

    // Delete prior checkout / detail lead for this item to upgrade to hot payment_failed lead
    if (itemId) {
      await Lead.deleteMany({ user: userId, itemId, visitType: { $in: ['detail', 'checkout', 'contentCheckout'] } })
    }

    const lead = await Lead.create({
      user: userId,
      purposeType,
      subType,
      visitType: 'payment_failed',
      leadStatus: 'hot',
      itemId,
      itemName,
      amount,
      paymentError: failureReason
    })

    this.logger.info({ userId, leadId: lead._id }, 'Payment failed lead recorded successfully')
    return { lead, success: true }
  }

  async listUserOrders(userId, query) {
    const paginated = await paymentRepository.listUserOrders(userId, query)

    const Course = require('../../models/Course.model')
    const TestSeries = require('../../models/TestSeries.model')
    const Booster = require('../../models/Booster.model')

    const courseIds = []
    const testIds = []
    const boosterIds = []

    paginated.data.forEach(order => {
      order.items.forEach(item => {
        if (item.itemType === 'course') courseIds.push(item.itemId)
        else if (item.itemType === 'test') testIds.push(item.itemId)
        else if (item.itemType === 'booster') boosterIds.push(item.itemId)
      })
    })

    const courses = await Course.find({ _id: { $in: courseIds } }).select('thumbnail').lean()
    const testSeries = await TestSeries.find({ _id: { $in: testIds } }).select('thumbnail').lean()
    const boosters = await Booster.find({ _id: { $in: boosterIds } }).select('thumbnailImage').lean()

    const imageMap = {}
    courses.forEach(c => { imageMap[c._id.toString()] = c.thumbnail })
    testSeries.forEach(t => { imageMap[t._id.toString()] = t.thumbnail })
    boosters.forEach(b => { imageMap[b._id.toString()] = b.thumbnailImage })

    paginated.data = paginated.data.map(order => {
      order.items = order.items.map(item => ({
        ...item,
        image: imageMap[item.itemId.toString()] || null
      }))
      return order
    })

    return paginated
  }
}

module.exports = new PaymentService()



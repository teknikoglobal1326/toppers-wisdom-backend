const BaseRepository = require('../../core/BaseRepository')
const Order      = require('../../models/Order.model')
const Enrollment = require('../../models/Enrollment.model')

class PaymentRepository extends BaseRepository {
  constructor() {
    super(Order, 'payment')
  }

  async findByRazorpayOrderId(razorpayOrderId) {
    return this.findOne({ razorpayOrderId })  // BaseRepository.findOne
  }

  async createEnrollmentsForOrder(userId, courseItems) {
    if (!courseItems.length) return []
    const docs = courseItems.map((item) => ({ user: userId, course: item.itemId }))
    return Enrollment.insertMany(docs, { ordered: false }).catch(() => [])
  }
}

module.exports = new PaymentRepository()
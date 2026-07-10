const BaseRepository = require('../../core/BaseRepository')
const CourseOrder      = require('../../models/CourseOrder.model')
const Enrollment = require('../../models/Enrollment.model')

class PaymentRepository extends BaseRepository {
  constructor() {
    super(CourseOrder, 'payment')
  }

  async findByRazorpayOrderId(razorpayOrderId) {
    return this.findOne({ razorpayOrderId })  // BaseRepository.findOne
  }

  async createEnrollmentsForOrder(userId, courseItems) {
    if (!courseItems.length) return []
    const docs = courseItems.map((item) => {
      const doc = { user: userId, course: item.itemId }
      if (!item.isLifetime && item.validityInMonths) {
        const expiresAt = new Date()
        expiresAt.setMonth(expiresAt.getMonth() + item.validityInMonths)
        doc.expiresAt = expiresAt
      }
      return doc
    })
    return Enrollment.insertMany(docs, { ordered: false }).catch(() => [])
  }
}

module.exports = new PaymentRepository()
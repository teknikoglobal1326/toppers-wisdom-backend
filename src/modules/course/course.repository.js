const BaseRepository = require('../../core/BaseRepository')
const Course = require('../../models/Course.model')
const Enrollment = require('../../models/Enrollment.model')


class CourseRepository extends BaseRepository {
  constructor() {
    super(Course, 'course')
  }

  // Enrollment queries are course-specific — add them here
  async findEnrollment(userId, courseId) {
    return Enrollment.findOne({ user: userId, course: courseId }).lean()
  }

  async findEnrollmentsByUser(userId) {
    return Enrollment.find({ user: userId }).lean()
  }

  async createEnrollment(userId, courseId, expiresAt = null) {
    const data = { user: userId, course: courseId }
    if (expiresAt) data.expiresAt = expiresAt;
    return Enrollment.create(data)
  }
  //real
  async addLesson(courseId, lesson) {
    return this.pushToArray(courseId, 'lessons', lesson)  // BaseRepository.pushToArray
  }

  async removeLesson(courseId, lessonId) {
    return this.pullFromArray(courseId, 'lessons', { _id: lessonId })  // BaseRepository.pullFromArray
  }

  async updateLesson(courseId, lessonId, data) {
    return this.model.findOneAndUpdate(
      { _id: courseId, 'lessons._id': lessonId },
      { $set: { 'lessons.$': { ...data, _id: lessonId } } },
      { new: true }
    ).lean()
  }

  async incrementEnrollments(courseId) {
    return this.increment(courseId, { totalEnrollments: 1 })  // BaseRepository.increment
  }

  async updateRating(courseId, avgRating, totalReviews) {
    return this.updateById(courseId, { avgRating, totalReviews })  // BaseRepository.updateById
  }

    async listPurchases(query = {}) {
    const { paginate } = require('../../core/paginate')
    const CourseOrder = require('../../models/CourseOrder.model')
    const mongoose = require('mongoose')

    const filter = { status: query.status || 'paid', 'items.itemType': 'course' }
    if (query.courseId) {
      filter['items.itemId'] = new mongoose.Types.ObjectId(query.courseId)
    }

    const dateFilter = {}
    if (query.fromDate || query.startDate) {
      const from = new Date(query.fromDate || query.startDate)
      if (!isNaN(from.getTime())) {
        from.setHours(0, 0, 0, 0)
        dateFilter.$gte = from
      }
    }
    if (query.toDate || query.endDate) {
      const to = new Date(query.toDate || query.endDate)
      if (!isNaN(to.getTime())) {
        to.setHours(23, 59, 59, 999)
        dateFilter.$lte = to
      }
    }
    if (Object.keys(dateFilter).length > 0) {
      filter.createdAt = dateFilter
    }

    if (query.search) {
      const User = require('../../models/User.model')
      const rx = new RegExp(query.search.trim(), 'i')
      const matchingUsers = await User.find({
        $or: [{ name: rx }, { email: rx }, { phone: rx }]
      }).select('_id').lean()
      const userIds = matchingUsers.map(u => u._id)

      filter.$or = [
        { razorpayOrderId: rx },
        { razorpayPaymentId: rx },
        { user: { $in: userIds } }
      ]
    }

    const result = await paginate(CourseOrder, filter, {
      page: query.page,
      limit: query.limit || 20,
      sort: { createdAt: -1 },
      populate: [
        { path: 'user', select: 'name email phone qualification' }
      ]
    })

    const globalFilter = { status: 'paid', 'items.itemType': 'course' }
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [globalTotalTransactions, todayCountRes, globalRevenueRes, filteredRevenueRes, courseWiseRevenueRes] = await Promise.all([
      CourseOrder.countDocuments(globalFilter),
      CourseOrder.countDocuments({ ...globalFilter, createdAt: { $gte: today } }),
      CourseOrder.aggregate([
        { $match: globalFilter },
        { $group: { _id: null, totalRevenue: { $sum: '$grandTotal' } } }
      ]),
      CourseOrder.aggregate([
        { $match: filter },
        { $group: { _id: null, totalRevenue: { $sum: '$grandTotal' }, count: { $sum: 1 } } }
      ]),
      CourseOrder.aggregate([
        { $match: filter },
        { $unwind: '$items' },
        { $match: { 'items.itemType': 'course' } },
        {
          $group: {
            _id: '$items.itemId',
            courseTitle: { $first: '$items.title' },
            transactionCount: { $sum: 1 },
            totalRevenue: { $sum: '$grandTotal' }
          }
        },
        { $sort: { totalRevenue: -1 } }
      ])
    ])

    result.pagination.globalTotalTransactions = globalTotalTransactions
    result.pagination.globalTodayTransactions = todayCountRes
    result.pagination.globalRevenue = globalRevenueRes.length > 0 ? globalRevenueRes[0].totalRevenue : 0
    result.pagination.filteredRevenue = filteredRevenueRes.length > 0 ? filteredRevenueRes[0].totalRevenue : 0
    result.pagination.filteredCount = filteredRevenueRes.length > 0 ? filteredRevenueRes[0].count : 0
    result.pagination.courseWiseRevenue = (courseWiseRevenueRes || []).map(c => ({
      courseId: c._id,
      courseTitle: c.courseTitle || 'Untitled Course',
      transactionCount: c.transactionCount,
      totalRevenue: c.totalRevenue
    }))

    return result
  }

  async exportPurchases(query = {}) {
    const CourseOrder = require('../../models/CourseOrder.model')
    const mongoose = require('mongoose')

    const filter = { status: query.status || 'paid', 'items.itemType': 'course' }
    if (query.courseId) {
      filter['items.itemId'] = new mongoose.Types.ObjectId(query.courseId)
    }

    const dateFilter = {}
    if (query.fromDate || query.startDate) {
      const from = new Date(query.fromDate || query.startDate)
      if (!isNaN(from.getTime())) {
        from.setHours(0, 0, 0, 0)
        dateFilter.$gte = from
      }
    }
    if (query.toDate || query.endDate) {
      const to = new Date(query.toDate || query.endDate)
      if (!isNaN(to.getTime())) {
        to.setHours(23, 59, 59, 999)
        dateFilter.$lte = to
      }
    }
    if (Object.keys(dateFilter).length > 0) {
      filter.createdAt = dateFilter
    }

    if (query.search) {
      const User = require('../../models/User.model')
      const rx = new RegExp(query.search.trim(), 'i')
      const matchingUsers = await User.find({
        $or: [{ name: rx }, { email: rx }, { phone: rx }]
      }).select('_id').lean()
      const userIds = matchingUsers.map(u => u._id)

      filter.$or = [
        { razorpayOrderId: rx },
        { razorpayPaymentId: rx },
        { user: { $in: userIds } }
      ]
    }

    const orders = await CourseOrder.find(filter)
      .sort({ createdAt: -1 })
      .populate('user', 'name email phone qualification')
      .lean()

    return orders.map((order, idx) => {
      const courseTitles = (order.items || [])
        .filter(i => i.itemType === 'course')
        .map(i => i.title)
        .join('; ')

      return {
        serialNo: idx + 1,
        orderId: order.razorpayOrderId || String(order._id),
        paymentId: order.razorpayPaymentId || 'N/A',
        studentName: order.user?.name || 'N/A',
        studentPhone: order.user?.phone || 'N/A',
        studentEmail: order.user?.email || 'N/A',
        courses: courseTitles || 'Course Package',
        totalAmount: order.totalAmount || 0,
        discount: order.discount || 0,
        gstRate: order.gstRate || 0,
        gstAmount: order.gstAmount || 0,
        grandTotal: order.grandTotal || order.totalAmount || 0,
        currency: order.currency || 'INR',
        status: order.status || 'paid',
        paymentDate: order.createdAt ? new Date(order.createdAt).toISOString() : ''
      }
    })
  }
}

module.exports = new CourseRepository()

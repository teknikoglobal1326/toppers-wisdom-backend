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

    const filter = { status: 'paid', 'items.itemType': 'course' }
    if (query.courseId) {
      filter['items.itemId'] = new mongoose.Types.ObjectId(query.courseId)
    }

    if (query.search) {
      const User = require('../../models/User.model')
      const rx = new RegExp(query.search, 'i')
      const matchingUsers = await User.find({
        $or: [{ name: rx }, { email: rx }, { phone: rx }]
      }).select('_id').lean()
      const userIds = matchingUsers.map(u => u._id)

      filter.$or = [
        { razorpayOrderId: new RegExp(query.search, 'i') },
        { user: { $in: userIds } }
      ]
    }

    return paginate(CourseOrder, filter, {
      page: query.page,
      limit: query.limit,
      sort: { createdAt: -1 },
      populate: [
        { path: 'user', select: 'name email phone qualification' }
      ]
    })
  }
}

module.exports = new CourseRepository()
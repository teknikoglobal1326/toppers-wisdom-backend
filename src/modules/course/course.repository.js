const BaseRepository = require('../../core/BaseRepository')
const Course     = require('../../models/Course.model')
const Enrollment = require('../../models/Enrollment.model')

class CourseRepository extends BaseRepository {
  constructor() {
    super(Course, 'course')
  }

  // Enrollment queries are course-specific — add them here
  async findEnrollment(userId, courseId) {
    return Enrollment.findOne({ user: userId, course: courseId }).lean()
  }

  async createEnrollment(userId, courseId) {
    return Enrollment.create({ user: userId, course: courseId })
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
}

module.exports = new CourseRepository()
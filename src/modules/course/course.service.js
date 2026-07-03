const BaseService = require('../../core/BaseService')
const courseRepository = require('./course.repository')
const { checkAccess } = require('../../lib/access')
const { getPresignedDownloadUrl } = require('../../lib/s3')
const AppError = require('../../core/AppError')
const { createLogger } = require('../../config/logger')
const User = require('../../models/User.model')

class CourseService extends BaseService {
  constructor() {
    super(courseRepository, 'course')
    this.logger = createLogger('course:service')
  }

  async listCourseSubjects(userId) {
    const user = await User.findById(userId).select('subExams').lean()
    const subExamIds = (user?.subExams || []).map((s) => s._id)
    this.logger.info({ userId, subExamIds }, 'Listing course subjects')

    const pipeline = [
      { $match: { subExam: { $in: subExamIds }, status: 'published' } },
      { $unwind: { path: '$subjects', preserveNullAndEmpty: false } },
      {
        $lookup: {
          from: 'subjects',
          localField: 'subjects.subject',
          foreignField: '_id',
          as: 'subjectInfo',
        },
      },
      { $unwind: '$subjectInfo' },
      { $match: { 'subjectInfo.isDeleted': false, 'subjectInfo.status': 'active' } },
      {
        $group: {
          _id: '$subjectInfo._id',
          name: { $first: '$subjectInfo.name' },
        },
      },
      { $sort: { name: 1 } },
    ]

    return this.repository.aggregate(pipeline)
  }

  async listCourses(userId, _ignored, filters, lang) {
    const user = await User.findById(userId).select('subExams').lean()
    const subExamIds = (user?.subExams || []).map((s) => s._id)
    this.logger.info({ userId, subExamIds }, 'Listing courses')

    const filter = { subExam: { $in: subExamIds }, status: 'published' }
    if (filters.type) filter.type = filters.type
    if (filters.isFree !== undefined) filter.isFree = filters.isFree === 'true'
    if (lang && lang !== 'both') filter.language = { $in: [lang, 'both'] }
    if (filters.subjectId) filter['subjects.subject'] = filters.subjectId

    const result = await this.getAll(filter, {
      page: filters.page, limit: filters.limit,
      select: 'title slug thumbnail type price isFree avgRating totalEnrollments instructor.name language description longDescription',
    })

    result.data = await Promise.all(result.data.map(async (course) => ({
      ...course,
      hasAccess: course.isFree || await checkAccess(userId, 'course', course._id),
    })))

    return result
  }

  async getCourse(courseId, userId) {
    this.logger.info({ courseId, userId }, 'Fetching course detail')
    // inherited: this.getById() throws 404 automatically if not found
    const course = await this.getById(courseId)
    const hasAccess = course.isFree || await checkAccess(userId, 'course', courseId)

    if (!hasAccess) {
      course.lessons = course.lessons.map((l) =>
        l.isPreview ? l : { ...l, videoKey: undefined, pdfKey: undefined }
      )
    }

    const enrollment = await courseRepository.findEnrollment(userId, courseId)
    return { ...course, hasAccess, enrollmentProgress: enrollment?.progressPercent || 0 }
  }

  async getVideoUrl(courseId, lessonId, userId) {
    const enrollment = await courseRepository.findEnrollment(userId, courseId)
    if (!enrollment) throw new AppError('You are not enrolled in this course', 403, 'FORBIDDEN')

    const course = await this.getById(courseId)
    const lesson = course.lessons.find((l) => l._id.toString() === lessonId)
    if (!lesson?.videoKey) throw new AppError('Video not available for this lesson', 404)

    const url = await getPresignedDownloadUrl(lesson.videoKey, 900)
    this.logger.info({ courseId, lessonId, userId }, 'Video URL generated')
    return { url, expiresIn: 900 }
  }

  async enrollFree(courseId, userId) {
    const course = await this.getById(courseId)
    if (!course.isFree) throw new AppError('This is a paid course. Please purchase it first.', 403)

    const existing = await courseRepository.findEnrollment(userId, courseId)
    if (existing) throw new AppError('Already enrolled', 409, 'DUPLICATE_ERROR')

    const enrollment = await courseRepository.createEnrollment(userId, courseId)
    await courseRepository.incrementEnrollments(courseId)
    this.logger.info({ courseId, userId }, 'User enrolled in free course')
    return enrollment
  }

  async addReview(courseId, userId, data) {
    this.logger.info({ courseId, userId }, 'Adding review')
    const enrollment = await courseRepository.findEnrollment(userId, courseId)
    if (!enrollment) throw new AppError('You must be enrolled to leave a review', 403)

    const course = await this.getById(courseId)
    const newTotal = course.totalReviews + 1
    const newAvg = parseFloat((((course.avgRating * course.totalReviews) + data.rating) / newTotal).toFixed(2))

    await courseRepository.updateRating(courseId, newAvg, newTotal)
    this.logger.info({ courseId, newAvg, newTotal }, 'Review added')
    return { avgRating: newAvg, totalReviews: newTotal }
  }

  async getTimetable(courseId) {
    this.logger.info({ courseId }, 'Fetching timetable')
    const course = await this.repository.findById(courseId, { select: 'title timetable lessons' })
    if (!course) throw new AppError('Course not found', 404)
    return { courseId, timetable: course.timetable || [], lessons: course.lessons || [] }
  }
}

module.exports = new CourseService()
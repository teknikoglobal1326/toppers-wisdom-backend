/**
 * Admin course service reuses the same courseRepository.
 * Admins get full access — no isFree/status filter.
 * BaseService.getAll / create / update / remove are all inherited.
 */
const BaseService    = require('../../core/BaseService')
const courseRepository = require('../../modules/course/course.repository')
const { getPresignedUploadUrl } = require('../../lib/s3')
const { createLogger } = require('../../config/logger')

class AdminCourseService extends BaseService {
  constructor() {
    super(courseRepository, 'admin:course')
    this.logger = createLogger('admin:course:service')
  }

  async listAll(filters) {
    // No status filter — admins see everything
    const filter = {}
    if (filters.status)  filter.status  = filters.status
    if (filters.subExam) filter.subExam = filters.subExam
    // inherited getAll
    return this.getAll(filter, { page: filters.page, limit: filters.limit })
  }

  async publish(courseId) {
    this.logger.info({ courseId }, 'Publishing course')
    // inherited update
    return this.update(courseId, { status: 'published', publishedAt: new Date() })
  }

  async archive(courseId) {
    this.logger.info({ courseId }, 'Archiving course')
    return this.update(courseId, { status: 'archived' })
  }

  async addLesson(courseId, lessonData) {
    this.logger.info({ courseId }, 'Adding lesson')
    return courseRepository.addLesson(courseId, lessonData)
  }

  async removeLesson(courseId, lessonId) {
    this.logger.info({ courseId, lessonId }, 'Removing lesson')
    return courseRepository.removeLesson(courseId, lessonId)
  }

  async getLessonUploadUrl(courseId, lessonId, contentType) {
    const key = `courses/${courseId}/lessons/${lessonId}/video`
    return getPresignedUploadUrl(key, contentType)
  }
}

module.exports = new AdminCourseService()
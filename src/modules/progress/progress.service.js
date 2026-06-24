const BaseService        = require('../../core/BaseService')
const progressRepository = require('./progress.repository')
const AppError           = require('../../core/AppError')
const { createLogger }   = require('../../config/logger')

class ProgressService extends BaseService {
  constructor() {
    super(progressRepository, 'progress')
    this.logger = createLogger('progress:service')
  }

  async updateLesson(userId, data) {
    const { lessonId, courseId, watchedSeconds, completed } = data
    this.logger.info({ userId, courseId, lessonId, watchedSeconds, completed }, 'Updating lesson progress')

    const enrollment = await progressRepository.getEnrollment(userId, courseId)
    if (!enrollment) throw new AppError('You are not enrolled in this course', 403, 'FORBIDDEN')

    const result = await progressRepository.updateLessonProgress(userId, courseId, lessonId, watchedSeconds || 0, completed || false)
    this.logger.info({ userId, courseId, progress: result.progressPercent }, 'Progress updated')
    return { progressPercent: result.progressPercent, lessonId, completed }
  }

  async getCourseProgress(userId, courseId) {
    this.logger.info({ userId, courseId }, 'Fetching course progress')
    const enrollment = await progressRepository.getEnrollment(userId, courseId)
    if (!enrollment) throw new AppError('You are not enrolled in this course', 403, 'FORBIDDEN')
    return enrollment
  }
}

module.exports = new ProgressService()

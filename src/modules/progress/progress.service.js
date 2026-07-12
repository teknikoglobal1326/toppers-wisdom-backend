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

  // Reduce raw per-test best-attempt rows into a module summary.
  // A test is "best" when the best attempt scored >= 70% of its total marks.
  summarizeAttempts(rows = []) {
    const attempted = rows.length
    let bestTests = 0
    let accuracySum = 0

    for (const row of rows) {
      accuracySum += Number(row.bestAccuracy || 0)
      const percent = row.totalMarks > 0 ? (row.bestScore / row.totalMarks) * 100 : 0
      if (percent >= 70) bestTests += 1
    }

    const averageAccuracy = attempted > 0
      ? parseFloat((accuracySum / attempted).toFixed(2))
      : 0

    return { attempted, bestTests, averageAccuracy, accuracySum }
  }

  async getTestProgress(userId) {
    this.logger.info({ userId }, 'Fetching combined test progress')

    const [
      testSeriesTotal,
      previousYearPaperTotal,
      testSeriesRows,
      previousYearPaperRows,
    ] = await Promise.all([
      progressRepository.countActiveTestSeriesTests(),
      progressRepository.countActivePreviousYearPaperTests(),
      progressRepository.getTestSeriesAttemptStats(userId),
      progressRepository.getPreviousYearPaperAttemptStats(userId),
    ])

    const testSeries = this.summarizeAttempts(testSeriesRows)
    const previousYearPaper = this.summarizeAttempts(previousYearPaperRows)

    const totalTests = testSeriesTotal + previousYearPaperTotal
    const attemptedTests = testSeries.attempted + previousYearPaper.attempted
    const remainingTests = Math.max(0, totalTests - attemptedTests)
    const bestTests = testSeries.bestTests + previousYearPaper.bestTests

    const averageAccuracy = attemptedTests > 0
      ? parseFloat(((testSeries.accuracySum + previousYearPaper.accuracySum) / attemptedTests).toFixed(2))
      : 0

    return {
      totalTests,
      attemptedTests,
      remainingTests,
      bestTests,
      averageAccuracy,
      breakdown: {
        testSeries: {
          totalTests: testSeriesTotal,
          attempted: testSeries.attempted,
          bestTests: testSeries.bestTests,
          averageAccuracy: testSeries.averageAccuracy,
        },
        previousYearPaper: {
          totalTests: previousYearPaperTotal,
          attempted: previousYearPaper.attempted,
          bestTests: previousYearPaper.bestTests,
          averageAccuracy: previousYearPaper.averageAccuracy,
        },
      },
    }
  }
}

module.exports = new ProgressService()

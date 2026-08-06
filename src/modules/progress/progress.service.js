const BaseService = require('../../core/BaseService')
const progressRepository = require('./progress.repository')
const AppError = require('../../core/AppError')
const { createLogger } = require('../../config/logger')

class ProgressService extends BaseService {
  constructor() {
    super(progressRepository, 'progress')
    this.logger = createLogger('progress:service')
  }

  async updateLesson(userId, data) {
    const { lessonId, topicId, courseId, watchedSeconds, completed } = data
    this.logger.info({ userId, courseId, lessonId, topicId, watchedSeconds, completed }, 'Updating lesson progress')

    let enrollment = await progressRepository.getEnrollment(userId, courseId)
    if (!enrollment) {
      const Course = require('../../models/Course.model')
      const course = await Course.findById(courseId).lean()
      if (!course) throw new AppError('Course not found', 404, 'NOT_FOUND')

      if (course.isFree) {
        const EnrollmentModel = require('../../models/Enrollment.model')
        try {
          enrollment = await EnrollmentModel.create({ user: userId, course: courseId })
        } catch (err) {
          enrollment = await progressRepository.getEnrollment(userId, courseId)
        }
      } else {
        throw new AppError('You are not enrolled in this course', 403, 'FORBIDDEN')
      }
    }

    const result = await progressRepository.updateLessonProgress(userId, courseId, lessonId, watchedSeconds || 0, completed || false, topicId)
    if (!result) throw new AppError('Failed to update progress', 500, 'SERVER_ERROR')
    this.logger.info({ userId, courseId, progress: result.progressPercent }, 'Progress updated')
    return { progressPercent: result.progressPercent, lessonId, topicId, completed }
  }

  async getCourseProgress(userId, courseId) {
    this.logger.info({ userId, courseId }, 'Fetching course progress')

    const Course = require('../../models/Course.model')
    const Content = require('../../models/Content.model')
    const Pdf = require('../../models/Pdf.model')
    const CourseTest = require('../../models/CourseTest.model')

    const coursePromise = Course.findById(courseId).select('lessons isFree').lean()
    const contentCountPromise = Content.countDocuments({ course: courseId, isDeleted: false, status: 'active' })
    const pdfCountPromise = Pdf.countDocuments({ course: courseId, isDeleted: false, status: 'active' })
    const testCountPromise = CourseTest.countDocuments({ course: courseId, isDeleted: false, status: 'active' })

    const [course, contentCount, pdfCount, testCount] = await Promise.all([
      coursePromise,
      contentCountPromise,
      pdfCountPromise,
      testCountPromise
    ])

    if (!course) throw new AppError('Course not found', 404, 'NOT_FOUND')

    const enrollment = await progressRepository.getEnrollment(userId, courseId)

    const totalItems = (course.lessons?.length || 0) + contentCount + pdfCount + testCount

    if (!enrollment) {
      if (course.isFree) {
        return {
          progress: [],
          progressPercent: 0,
          totalItems,
          completedItems: 0
        }
      }
      throw new AppError('You are not enrolled in this course', 403, 'FORBIDDEN')
    }

    const completedItems = enrollment.progress.length

    const enrollmentObj = enrollment.toObject ? enrollment.toObject() : enrollment
    return {
      ...enrollmentObj,
      totalItems,
      completedItems
    }
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

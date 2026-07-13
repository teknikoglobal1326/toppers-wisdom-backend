const BaseRepository = require('../../core/BaseRepository')
const Enrollment     = require('../../models/Enrollment.model')
const User           = require('../../models/User.model')
const TestSeriesTest         = require('../../models/TestSeriesTest.model')
const PreviousYearPaperTest  = require('../../models/PreviousYearPaperTest.model')
const TestSeriesAttempt      = require('../../models/TestSeriesAttempt.model')
const PreviousYearPaperAttempt = require('../../models/PreviousYearPaperAttempt.model')

class ProgressRepository extends BaseRepository {
  constructor() { super(Enrollment, 'progress') }

  // Count of active, non-deleted tests available across a module.
  async countActiveTests(Model) {
    return Model.countDocuments({ isDeleted: false, status: 'active' })
  }

  // Per-test best attempt stats for a user (one row per distinct test attempted).
  async getBestAttemptStats(userId, Model) {
    return Model.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: '$test',
          bestScore: { $max: '$score' },
          bestAccuracy: { $max: '$accuracy' },
          totalMarks: { $max: '$totalMarks' },
          attempts: { $sum: 1 },
        },
      },
    ])
  }

  countActiveTestSeriesTests() { return this.countActiveTests(TestSeriesTest) }
  countActivePreviousYearPaperTests() { return this.countActiveTests(PreviousYearPaperTest) }
  getTestSeriesAttemptStats(userId) { return this.getBestAttemptStats(userId, TestSeriesAttempt) }
  getPreviousYearPaperAttemptStats(userId) { return this.getBestAttemptStats(userId, PreviousYearPaperAttempt) }

  async getEnrollment(userId, courseId) {
    return this.findOne({ user: userId, course: courseId })
  }

  async updateLessonProgress(userId, courseId, lessonId, watchedSeconds, completed) {
    const enrollment = await Enrollment.findOne({ user: userId, course: courseId })
    if (!enrollment) return null

    const existing = enrollment.progress.find((p) => p.lessonId.toString() === lessonId)

    if (existing) {
      existing.watchedSeconds = Math.max(existing.watchedSeconds, watchedSeconds)
      if (completed && !existing.completed) {
        existing.completed   = true
        existing.completedAt = new Date()
      }
    } else {
      enrollment.progress.push({
        lessonId,
        watchedSeconds,
        completed,
        completedAt: completed ? new Date() : undefined,
      })
    }

    const Course = require('../../models/Course.model')
    const course = await Course.findById(courseId).select('lessons').lean()
    const total  = course?.lessons?.length || 1
    const done   = enrollment.progress.filter((p) => p.completed).length
    enrollment.progressPercent = parseFloat(((done / total) * 100).toFixed(2))

    await enrollment.save()
    await User.findByIdAndUpdate(userId, { $inc: { watchDuration: watchedSeconds } })

    return enrollment
  }
}

module.exports = new ProgressRepository()

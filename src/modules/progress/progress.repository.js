const BaseRepository = require('../../core/BaseRepository')
const Enrollment     = require('../../models/Enrollment.model')
const User           = require('../../models/User.model')

class ProgressRepository extends BaseRepository {
  constructor() { super(Enrollment, 'progress') }

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

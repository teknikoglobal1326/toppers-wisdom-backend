const mongoose = require('mongoose')

const enrollmentSchema = new mongoose.Schema({
  user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  progress: [{
    lessonId:       mongoose.Schema.Types.ObjectId,
    completed:      { type: Boolean, default: false },
    watchedSeconds: { type: Number, default: 0 },
    completedAt:    Date,
  }],
  progressPercent: { type: Number, default: 0 },
  enrolledAt:  { type: Date, default: Date.now },
  completedAt: Date,
  expiresAt:   Date,
}, { timestamps: true })

enrollmentSchema.index({ user: 1, course: 1 }, { unique: true })
module.exports = mongoose.model('Enrollment', enrollmentSchema)
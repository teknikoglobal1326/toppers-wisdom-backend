const mongoose = require('mongoose')

const noteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  lessonId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  notes: [{
    title: { type: String, trim: true, default: '' },
    text: { type: String, trim: true, default: '' },
    image: { type: String, trim: true, default: '' },
    audio: { type: String, trim: true, default: '' },
    videoTimestamp: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
  }],
  isDeleted: { type: Boolean, default: false, index: true }
}, { timestamps: true })

noteSchema.index({ user: 1, course: 1, lessonId: 1 }, { unique: true })

module.exports = mongoose.model('Note', noteSchema)

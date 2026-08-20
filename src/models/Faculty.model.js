const mongoose = require('mongoose')

const facultySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  designation: { type: String, trim: true, default: '' },
  subject: { type: String, trim: true, default: '' },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null, index: true },
  bio: { type: String, trim: true, default: '' },
  image: { type: String, default: null },
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', default: null, index: true },
  subexamId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubExam', default: null, index: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null, index: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  sortOrder: { type: Number, default: 0, index: true },
  isDeleted: { type: Boolean, default: false, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null }
}, { timestamps: true })

facultySchema.index({ isDeleted: 1, status: 1, sortOrder: 1, createdAt: -1 })

module.exports = mongoose.model('Faculty', facultySchema)

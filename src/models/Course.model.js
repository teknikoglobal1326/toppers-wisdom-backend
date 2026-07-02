const mongoose = require('mongoose')

const lessonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ['video', 'pdf', 'quiz'], required: true },
  subject: String,
  videoKey: String,
  pdfKey: String,
  duration: { type: Number, default: 0 },
  isPreview: { type: Boolean, default: false },
  sortOrder: { type: Number, default: 0 },
  language: { type: String, enum: ['hi', 'en'], default: 'hi' },
})

const courseSchema = new mongoose.Schema({
  exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
  subExam: { type: mongoose.Schema.Types.ObjectId, ref: 'SubExam', required: true, index: true },
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  longDescription: String,
  language: { type: String, enum: ['hi', 'en', 'both'], default: 'hi' },
  type: { type: String, enum: ['recorded', 'live', 'free'], required: true, index: true },
  mrp: { type: Number, default: 0 },
  price: { type: Number, default: 0 },
  isFree: { type: Boolean, default: false, index: true },
  thumbnail: String,
  bannerImage: [String],
  instructor: { name: String, avatar: String, bio: String },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
  subjects: [{ subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true }, sortOrder: { type: Number, default: 0 } }],
  lessons: [lessonSchema],
  tests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Test' }],
  avgRating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  totalEnrollments: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

courseSchema.index({ subExam: 1, status: 1, isFree: 1 })
module.exports = mongoose.model('Course', courseSchema)
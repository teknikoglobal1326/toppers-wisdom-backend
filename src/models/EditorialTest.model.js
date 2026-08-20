const mongoose = require('mongoose')

const localizedBlock = {
  title: { type: String, trim: true, default: null },
  description: { type: String, default: null },
  instructions: { type: String, default: null },
}

const editorialTestSchema = new mongoose.Schema({
  editorial: { type: mongoose.Schema.Types.ObjectId, ref: 'Editorial', default: null, index: true },
  subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
  subjectIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
  chapterIds: [{ type: mongoose.Schema.Types.ObjectId }],
  topicIds: [{ type: mongoose.Schema.Types.ObjectId }],
  title: { type: String, required: true, trim: true },
  slug: { type: String, lowercase: true, trim: true },
  thumbnailImage: { type: String, default: null },
  thumbnail: { type: String, default: null },
  description: { type: String, default: null },
  duration: { type: Number, required: true, min: 0, default: 0 },
  isPerQuestionTime: { type: Boolean, default: true },
  totalQuestions: { type: Number, required: true, min: 0, default: 0 },
  mappedQuestions: { type: Number, default: 0, min: 0 },
  totalMappedQuestions: { type: Number, default: 0, min: 0 },
  totalMarks: { type: Number, required: true, min: 0, default: 0 },
  marksPerQuestion: { type: Number, required: true, min: 0, default: 1 },
  isNegativeMarking: { type: Boolean, default: false },
  negativeMarks: { type: Number, required: true, min: 0, default: 0 },
  passingMarks: { type: Number, required: true, min: 0, default: 0 },
  instructions: { type: String, default: null },
  instructionsNew: { type: String, default: null },
  isPaid: { type: Boolean, default: false, index: true },
  isFree: { type: Boolean, default: true, index: true },
  status: { type: String, enum: ['active', 'inactive', 'draft', 'published'], default: 'active', index: true },
  languages: {
    type: [{ type: String, enum: ['en', 'hi'] }],
    default: ['en'],
    validate: [(v) => Array.isArray(v) && v.length >= 1, 'At least one language is required'],
  },
  localizedContent: {
    en: { type: localizedBlock, default: {} },
    hi: { type: localizedBlock, default: null },
  },
  scheduleAt: { type: Date, default: null },
  sortOrder: { type: Number, default: 0 },
  totalAttempts: { type: Number, default: 0 },
  totalViews: { type: Number, default: 0 },
  isDeleted: { type: Boolean, default: false, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
}, { timestamps: true })

module.exports = mongoose.model('EditorialTest', editorialTestSchema)
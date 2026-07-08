const mongoose = require('mongoose')

const pdfSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  topic: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true, index: true },
  chapter: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
    validate: {
      validator: (value) => {
        if (value === null || value === undefined) return true
        return typeof value === 'object'
          && !Array.isArray(value)
          && typeof value.title === 'string'
          && value.title.trim().length > 0
      },
      message: 'chapter must be an object with a non-empty title',
    },
  },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  pdfFile: { type: String, required: true },
  image: { type: String, default: '' },
  sortOrder: { type: Number, default: 0, index: true },
//   instruction: { type: String, default: '' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  isDeleted: { type: Boolean, default: false, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true })

module.exports = mongoose.model('Pdf', pdfSchema)
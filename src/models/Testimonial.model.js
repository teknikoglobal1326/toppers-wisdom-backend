const mongoose = require('mongoose')

const testimonialSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  exam: { type: String, required: true, trim: true },
  rank: { type: String, trim: true, default: '' },
  year: { type: String, trim: true, default: '' },
  priority: { type: Number, default: 0 },
  stats: { type: String, trim: true, default: '' },
  image: { type: String, default: '' },
  reviewText: { type: String, required: true, trim: true },

  isDeleted: { type: Boolean, default: false, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true })

module.exports = mongoose.model('Testimonial', testimonialSchema)

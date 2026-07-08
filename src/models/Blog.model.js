const mongoose = require('mongoose')

const blogSchema = new mongoose.Schema({
  title: { type: String, required: true }, slug: { type: String, required: true, unique: true, index: true },
  longDescription: { type: String, required: true }, shortDescription: String, image: String,
  sortOrder: { type: Number, default: 0, index: true },
  author: { name: String, avatar: String },
  category: { type: String, index: true }, tags: [String],
  language: { type: String, enum: ['hi', 'en', 'both'], default: 'both', index: true },
  status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
  publishedAt: Date, createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

module.exports = mongoose.model('Blog', blogSchema)
const mongoose = require('mongoose')

const blogSchema = new mongoose.Schema({
  title: { type: String, required: true }, slug: { type: String, required: true, unique: true, index: true },
  content: { type: String, required: true }, excerpt: String, thumbnail: String,
  author: { name: String, avatar: String },
  category: { type: String, index: true }, tags: [String],
  status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
  publishedAt: Date, createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

module.exports = mongoose.model('Blog', blogSchema)
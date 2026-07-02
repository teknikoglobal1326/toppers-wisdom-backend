const mongoose = require('mongoose')

const bookSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  author:      { type: String, default: null, trim: true },
  coverImage:  { type: String, default: null },
  description: { type: String, default: null },
  price:       { type: Number, default: 0 },
  isFree:      { type: Boolean, default: false, index: true },
  section:     { type: String, enum: ['myBooks', 'eBooks', 'books', 'audioBooks'], default: 'books', index: true },
  file:        { type: String, default: null },
  buyUrl:      { type: String, default: null },
  pages:       { type: Number, default: 0 },
  rating:      { type: Number, default: 0 },
  tags:        { type: [String], default: [] },
  language:    { type: String, enum: ['hi', 'en', 'both'], default: 'hi', index: true },
  status:      { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  isDeleted:   { type: Boolean, default: false, index: true },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
}, { timestamps: true })

module.exports = mongoose.model('Book', bookSchema)

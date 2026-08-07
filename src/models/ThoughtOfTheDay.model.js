const mongoose = require('mongoose')

const thoughtOfTheDaySchema = new mongoose.Schema({
  quote:        { type: String, required: true, trim: true },
  authorName:   { type: String, required: true, trim: true },
  designation:  { type: String, default: '' },
  authorImage:  { type: String, default: null },
  publishDate:  { type: Date, required: true, index: true },
  color:        { type: String, default: null },
  status:       { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  sortOrder:    { type: Number, default: 0, index: true },
  isDeleted:    { type: Boolean, default: false, index: true },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, { timestamps: true })

module.exports = mongoose.model('ThoughtOfTheDay', thoughtOfTheDaySchema)

const mongoose = require('mongoose')

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  comment: { type: String, required: true, trim: true }
}, { timestamps: true })

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
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  likes:        [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
  shares:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
  comments:     { type: [commentSchema], default: [] }
}, { timestamps: true })

module.exports = mongoose.model('ThoughtOfTheDay', thoughtOfTheDaySchema)

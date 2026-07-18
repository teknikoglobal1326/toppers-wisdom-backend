const mongoose = require('mongoose')

const topicSchema = new mongoose.Schema({
  course:     { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  subjects:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject', index: true }],
  topicName:  [{ type: mongoose.Schema.Types.ObjectId }],
  sortOrder:  { type: Number, default: 0, index: true },
  chapters:   [{ type: mongoose.Schema.Types.ObjectId }],
  status:     { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  isDeleted:  { type: Boolean, default: false, index: true },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })


module.exports = mongoose.model('Topic', topicSchema)
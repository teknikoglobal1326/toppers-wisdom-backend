const mongoose = require('mongoose')

const topicSchema = new mongoose.Schema({
  course:     { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  topicName:      { type: String, required: true, trim: true },
  chapters: [{
    title:    { type: String, required: true, trim: true },
  }],
  status:     { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  isDeleted:  { type: Boolean, default: false, index: true },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })


module.exports = mongoose.model('Topic', topicSchema)
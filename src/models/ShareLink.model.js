const mongoose = require('mongoose');

const shareLinkSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  resourceType: {
    type: String,
    required: true,
    enum: [
      'course',
      'subject',
      'topic',
      'chapter',
      'video',
      'youtube',
      'test',
      'pdf',
      'test-series',
      'vocabulary',
      'editorial',
      'daily-quiz',
      'book',
      'previous-year-paper'
    ],
    index: true
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  title: {
    type: String,
    default: ''
  },
  image: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('ShareLink', shareLinkSchema);

const mongoose = require('mongoose')

const vocabularyUserStateSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  vocabulary: { type: mongoose.Schema.Types.ObjectId, ref: 'Vocabulary', required: true, index: true },
  isRead: { type: Boolean, default: false, index: true },
  isBookmarked: { type: Boolean, default: false, index: true },
  readAt: { type: Date, default: null },
  bookmarkedAt: { type: Date, default: null },
}, { timestamps: true })

vocabularyUserStateSchema.index({ user: 1, vocabulary: 1 }, { unique: true })
vocabularyUserStateSchema.index({ user: 1, isRead: 1, isBookmarked: 1 })

module.exports = mongoose.model('VocabularyUserState', vocabularyUserStateSchema)

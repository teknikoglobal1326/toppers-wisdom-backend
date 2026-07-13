const mongoose = require('mongoose')

const grammarChapterLikeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  grammarId: { type: mongoose.Schema.Types.ObjectId, ref: 'Grammar', required: true, index: true },
  chapterId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  isLiked: { type: Boolean, default: false },
  isRead: { type: Boolean, default: false, index: true },
  isBookmarked: { type: Boolean, default: false, index: true },
  readAt: { type: Date, default: null },
  bookmarkedAt: { type: Date, default: null },
}, { timestamps: true })

grammarChapterLikeSchema.index({ userId: 1, grammarId: 1, chapterId: 1 }, { unique: true })
grammarChapterLikeSchema.index({ userId: 1, isRead: 1, isBookmarked: 1 })

module.exports = mongoose.model('UserGrammarChapterLike', grammarChapterLikeSchema)

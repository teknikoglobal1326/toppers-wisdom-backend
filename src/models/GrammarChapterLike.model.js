const mongoose = require('mongoose')

const grammarChapterLikeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  grammarId: { type: mongoose.Schema.Types.ObjectId, ref: 'Grammar', required: true, index: true },
  chapterId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  isLiked: { type: Boolean, default: false },
}, { timestamps: true })

grammarChapterLikeSchema.index({ userId: 1, grammarId: 1, chapterId: 1 }, { unique: true })

module.exports = mongoose.model('UserGrammarChapterLike', grammarChapterLikeSchema)

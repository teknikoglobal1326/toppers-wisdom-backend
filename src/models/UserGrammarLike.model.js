const mongoose = require('mongoose')

const userGrammarLikeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  grammarId: { type: mongoose.Schema.Types.ObjectId, ref: 'Grammar', required: true, index: true },
  isLiked: { type: Boolean, default: true },
}, { timestamps: true })

userGrammarLikeSchema.index({ userId: 1, grammarId: 1 }, { unique: true })

module.exports = mongoose.model('UserGrammarLike', userGrammarLikeSchema)

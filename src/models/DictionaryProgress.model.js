const mongoose = require('mongoose');

const dictionaryProgressSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  wordId: { type: String, ref: 'DictionaryWord', required: true }, 
  status: { type: String, enum: ['learning', 'reviewing', 'mastered'], default: 'learning' },
  nextReviewDate: { type: Date, required: true, default: Date.now },
  interval: { type: Number, default: 0 }, 
  easeFactor: { type: Number, default: 2.5 }, 
  consecutiveCorrect: { type: Number, default: 0 }
}, { timestamps: true });

dictionaryProgressSchema.index({ studentId: 1, wordId: 1 }, { unique: true });

module.exports = mongoose.model('DictionaryProgress', dictionaryProgressSchema);

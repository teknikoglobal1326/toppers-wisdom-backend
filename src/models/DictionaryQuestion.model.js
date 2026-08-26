const mongoose = require('mongoose');

const dictionaryQuestionSchema = new mongoose.Schema({
  cat: { type: String, required: true },
  exams: [{ type: String }],
  q: { type: String, required: true },
  opts: [{ type: String, required: true }],
  ans: { type: String, required: true },
  expl: { type: String },
  tip: { type: String },
  wordId: { type: String, ref: 'DictionaryWord' }
}, { timestamps: true });

module.exports = mongoose.model('DictionaryQuestion', dictionaryQuestionSchema);

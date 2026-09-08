const mongoose = require('mongoose');

const dictionaryQuestionSchema = new mongoose.Schema({
  cat: { 
    type: String, 
    required: true,
    enum: [
      'one-word-sub', 
      'idioms-phrases', 
      'synonyms', 
      'antonyms', 
      'spellings', 
      'phrasal-verbs', 
      'homonyms', 
      'proverbs'
    ]
  },
  exams: [{ type: String }],
  q: { type: String, required: true },
  opts: [{ type: String, required: true }],
  ans: { type: String, required: true },
  expl: { type: String },
  tip: { type: String },
  wordId: { type: String, ref: 'DictionaryWord' }
}, { timestamps: true });

dictionaryQuestionSchema.pre('validate', function (next) {
  if (this.cat && typeof this.cat === 'string') {
    const c = this.cat.toLowerCase().trim();
    if (c.includes('idiom') || c.includes('phrase')) this.cat = 'idioms-phrases';
    else if (c.includes('synonym')) this.cat = 'synonyms';
    else if (c.includes('antonym')) this.cat = 'antonyms';
    else if (c.includes('spell')) this.cat = 'spellings';
    else if (c.includes('homonym')) this.cat = 'homonyms';
    else if (c.includes('phrasal')) this.cat = 'phrasal-verbs';
    else if (c.includes('proverb')) this.cat = 'proverbs';
    else if (c.includes('one') || c.includes('substitut') || c.includes('ows')) this.cat = 'one-word-sub';
  }
  next();
});

module.exports = mongoose.model('DictionaryQuestion', dictionaryQuestionSchema);

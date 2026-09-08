const mongoose = require('mongoose');

const dictionaryWordSchema = new mongoose.Schema({
  _id: { type: String, required: true },
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
  word: { type: String, required: true },
  pron: { type: String },
  pos: { type: String },
  rep: { type: Number, default: 0 },
  en: { type: String, required: true },
  hi: { type: String },
  exams: [{ type: String }],
  examCount: { type: Number, default: 0 },
  syn: [{ type: String }],
  ant: [{ type: String }],
  usage: [{ type: String }],
  daily: [{ type: String }],
  hook: { type: String },
  note: { type: String },
  deriv: [{ type: String }],
  theme: { type: String },
  src: { type: String }
}, { timestamps: true });

dictionaryWordSchema.pre('validate', function (next) {
  // Normalize category before validation runs
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

dictionaryWordSchema.pre('save', function (next) {
  const fieldsToCheck = ['en', 'hi', 'hook', 'note'];
  const arrayFieldsToCheck = ['usage', 'daily'];

  // Em-dash check & auto-replace
  for (const field of fieldsToCheck) {
    if (this[field] && typeof this[field] === 'string' && this[field].includes('—')) {
      this[field] = this[field].replace(/—/g, ' - ');
    }
  }
  for (const field of arrayFieldsToCheck) {
    if (this[field] && this[field].length > 0) {
      this[field] = this[field].map(item => (typeof item === 'string' ? item.replace(/—/g, ' - ') : item));
    }
  }

  // Danda check & auto-fix
  if (this.hook && this.hook.trim() && !this.hook.trim().endsWith('।')) {
    this.hook = this.hook.trim() + ' ।';
  }
  if (this.note && this.note.trim() && !this.note.trim().endsWith('।')) {
    this.note = this.note.trim() + ' ।';
  }

  next();
});

module.exports = mongoose.model('DictionaryWord', dictionaryWordSchema);
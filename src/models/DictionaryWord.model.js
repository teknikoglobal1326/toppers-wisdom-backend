const mongoose = require('mongoose');

const dictionaryWordSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Custom ID, e.g., "w_00187"
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

dictionaryWordSchema.pre('save', function (next) {
  const fieldsToCheck = ['en', 'hi', 'hook', 'note'];
  const arrayFieldsToCheck = ['usage', 'daily'];

  // Em-dash check
  for (const field of fieldsToCheck) {
    if (this[field] && this[field].includes('—')) {
      return next(new Error(`Validation Error: ${field} cannot contain em-dashes.`));
    }
  }
  for (const field of arrayFieldsToCheck) {
    if (this[field] && this[field].length > 0) {
      for (const item of this[field]) {
        if (item.includes('—')) {
          return next(new Error(`Validation Error: ${field} cannot contain em-dashes.`));
        }
      }
    }
  }

  // Danda check
  if (this.hook && !this.hook.trim().endsWith('।')) {
    return next(new Error(`Validation Error: hook must end in a danda (।).`));
  }
  if (this.note && !this.note.trim().endsWith('।')) {
    return next(new Error(`Validation Error: note must end in a danda (।).`));
  }

  next();
});

module.exports = mongoose.model('DictionaryWord', dictionaryWordSchema);

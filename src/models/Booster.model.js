const mongoose = require('mongoose')

const boosterSchema = new mongoose.Schema({
  subExam:  { type: mongoose.Schema.Types.ObjectId, ref: 'SubExam', index: true },
  type:     { type: String, enum: ['pyp_dictionary', 'editorial', 'grammar'], required: true, index: true },
  title:    { type: String, required: true },
  language: { type: String, enum: ['hi', 'en', 'both'], default: 'hi' },
  isActive: { type: Boolean, default: true, index: true },
  items: [{
    title:       { type: String, required: true },
    contentType: { type: String, enum: ['word', 'article', 'topic'], required: true },
    audioKey: String, pdfKey: String, content: String,
    isFree: { type: Boolean, default: false },
    subItems: [{ title: String, pdfKey: String, testRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' } }],
    sortOrder: { type: Number, default: 0 },
  }],
}, { timestamps: true })

module.exports = mongoose.model('Booster', boosterSchema)
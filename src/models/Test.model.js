const mongoose = require('mongoose')

const questionSchema = new mongoose.Schema({
  questionText:  { type: String, required: true },
  options:       { type: [String], required: true },
  correctOption: { type: Number, required: true, min: 0, max: 3 },
  marks:         { type: Number, default: 1 },
  negativeMarks: { type: Number, default: 0.25 },
  explanation:   String,
  language:      { type: String, enum: ['hi', 'en'], default: 'hi' },
  imageKey:      String,
})

const subTestSchema = new mongoose.Schema({
  title: { type: String, required: true }, totalMarks: Number, duration: Number,
  questions: [questionSchema],
})

const testSchema = new mongoose.Schema({
  subExam:         { type: mongoose.Schema.Types.ObjectId, ref: 'SubExam', required: true, index: true },
  course:          { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
  title:           { type: String, required: true },
  sortOrder:       { type: Number, default: 0, index: true },
  type:            { type: String, enum: ['practice','mock','pyp','sectional','ai_generated','daily_quiz'], required: true, index: true },
  language:        { type: String, enum: ['hi', 'en', 'both'], default: 'hi' },
  isFree:          { type: Boolean, default: false, index: true },
  price:           { type: Number, default: 0 },
  status:          { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
  totalMarks:      Number,
  duration:        Number,
  negativeMarking: { type: Boolean, default: false },
  negativeMarks:   { type: Number, default: 0.25 },
  subTests:        [subTestSchema],
  createdBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

module.exports = mongoose.model('Test', testSchema)
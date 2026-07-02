const mongoose = require('mongoose')

const boosterSchema = new mongoose.Schema({
  exam:             { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', index: true },
  subExam:          { type: mongoose.Schema.Types.ObjectId, ref: 'SubExam', index: true },
  type:             { type: String, enum: ['vocabulary', 'editorial', 'grammar', 'math'], required: true, index: true },
  subType:          { type: String },
  title:            { type: String, required: true },
  shortDescription: { type: String },
  longDescription:  { type: String },
  thumbnailImage:   { type: String },
  bannerImage:      { type: String },
  tag:              [{ type: String }],
  file:             { type: String },
  isFree:           { type: Boolean, default: false },
  price:            { type: Number, default: 0 },
  mrp:              { type: Number, default: 0 },
  sortOrder:        { type: Number, default: 0 },
  date:             { type: Date },
  language:         { type: String, enum: ['hi', 'en', 'both'], default: 'hi' },
  isActive:         { type: Boolean, default: true, index: true },
}, { timestamps: true })

module.exports = mongoose.model('Booster', boosterSchema)
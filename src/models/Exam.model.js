const mongoose = require('mongoose')

const examSchema = new mongoose.Schema({
  qualification:    { type: mongoose.Schema.Types.ObjectId, ref: 'Qualification', required: true, index: true },
  name:             { type: String, required: true, trim: true },
  image:            { type: String, default: null },
  subexamCount:     { type: Number, default: 0, min: 0 },
  shortDescription: { type: String, trim: true, default: null },
  status:           { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  is_deleted:       { type: Boolean, default: false, index: true },
}, { timestamps: true })

module.exports = mongoose.model('Exam', examSchema)

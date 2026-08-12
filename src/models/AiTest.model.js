const mongoose = require('mongoose')

const aiTestSchema = new mongoose.Schema({
  user:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:           { type: String, required: true, trim: true },
  subjects:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject', index: true }],
  chapters:       [{ type: mongoose.Schema.Types.ObjectId, index: true }],
  topics:         [{ type: mongoose.Schema.Types.ObjectId, index: true }],
  duration:       { type: Number, required: true }, // in minutes
  totalQuestions: { type: Number, required: true },
  isDeleted:      { type: Boolean, default: false, index: true },
}, { timestamps: true })

module.exports = mongoose.model('AiTest', aiTestSchema)

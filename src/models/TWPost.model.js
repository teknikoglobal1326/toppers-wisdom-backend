const mongoose = require('mongoose')

const twPostSchema = new mongoose.Schema({
  type:             { type: String, enum: ['image', 'text'], required: true, index: true },
  title:            { type: String, required: true, trim: true },
  shortDescription: { type: String, default: '' },
  image:            { type: String, default: null },
  textContent:      { type: String, default: '' },
  color:            { type: String, default: null },
  status:           { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  sortOrder:        { type: Number, default: 0, index: true },
  isDeleted:        { type: Boolean, default: false, index: true },
  createdBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, { timestamps: true })

module.exports = mongoose.model('TWPost', twPostSchema)

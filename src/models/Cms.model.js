const mongoose = require('mongoose')

const cmsSchema = new mongoose.Schema({
  type:      { type: String, enum: ['termCondition', 'privacyPolicy', 'aboutUs'], required: true, unique: true },
  content:   { type: String, required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true })

module.exports = mongoose.model('Cms', cmsSchema)
  
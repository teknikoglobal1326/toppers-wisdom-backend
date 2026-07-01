const mongoose = require('mongoose')

const appVersionSchema = new mongoose.Schema({
  platform:      { type: String, enum: ['android', 'ios'], required: true, unique: true },
  latestVersion: { type: String, required: true },
  minVersion:    { type: String, required: true },
  forceUpdate:   { type: Boolean, default: false },
  releaseNotes:  { type: String, default: '' },
  storeUrl:      { type: String, default: '' },
  updatedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true })

module.exports = mongoose.model('AppVersion', appVersionSchema)

const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema({
  user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title:  { type: String, required: true }, body: { type: String, required: true },
  type:   { type: String, enum: ['course', 'test', 'payment', 'system'], required: true },
  isRead: { type: Boolean, default: false },
  data:   mongoose.Schema.Types.Mixed,
}, { timestamps: true })

notificationSchema.index({ user: 1, isRead: 1 })
module.exports = mongoose.model('Notification', notificationSchema)
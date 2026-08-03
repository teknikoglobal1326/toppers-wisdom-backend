const mongoose = require('mongoose')

const notificationCampaignSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  image: { type: String, default: '' },
  notificationType: { type: String, default: 'marketing' },
  schedule: { type: Date, required: true, index: true },

  isProcessed: { type: Boolean, default: false, index: true },
  jobId: { type: String, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isDeleted: { type: Boolean, default: false, index: true }
}, { timestamps: true })

module.exports = mongoose.model('NotificationCampaign', notificationCampaignSchema)

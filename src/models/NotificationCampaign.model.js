const mongoose = require('mongoose')

const notificationCampaignSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  image: { type: String, default: '' },
  notificationType: { type: String, default: 'marketing' },
  schedule: { type: Date, required: true, index: true },
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', default: null },
  subExamId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubExam', default: null },
  all: { type: Boolean, default: false },
  moduleType: { type: String, default: null },
  moduleId: { type: String, default: null },
  countdown: { type: Date, default: null },

  isProcessed: { type: Boolean, default: false, index: true },
  jobId: { type: String, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isDeleted: { type: Boolean, default: false, index: true }
}, { timestamps: true })

module.exports = mongoose.model('NotificationCampaign', notificationCampaignSchema)

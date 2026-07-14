const mongoose = require('mongoose')

const userReportSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    itemType: { type: String, enum: ['vocabulary', 'editorial'], required: true, index: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    contentType: { type: String, required: true, trim: true, index: true },
    itemTitle: { type: String, trim: true },
    description: { type: String, required: true, trim: true },
    status: { type: String, enum: ['open', 'reviewed', 'resolved'], default: 'open', index: true },
    reportedAt: { type: Date, default: Date.now, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
)

userReportSchema.index({ user: 1, reportedAt: -1 })
userReportSchema.index({ itemType: 1, itemId: 1 })

module.exports = mongoose.model('UserReport', userReportSchema)

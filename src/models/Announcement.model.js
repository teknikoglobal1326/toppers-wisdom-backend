const mongoose = require('mongoose')

const announcementBlockSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  priority: { type: Number, default: 0 }
}, { _id: false })

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  image: { type: String, default: '' },
  highlightedText: { type: String, default: '' },
  redirectUrl: { type: String, default: '' },
  iconStatus: { type: String, default: 'active' },
  announcementBlocks: { type: [announcementBlockSchema], default: [] },
  schedule: { type: Date, required: false, default: null, index: true },
  countdown: { type: Date, default: null },

  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', default: null },
  subExamId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubExam', default: null },
  all: { type: Boolean, default: true },
  moduleType: { type: String, default: null },
  moduleId: { type: String, default: null },

  isProcessed: { type: Boolean, default: false, index: true },
  jobId: { type: String, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isDeleted: { type: Boolean, default: false, index: true }
}, { timestamps: true })

module.exports = mongoose.model('Announcement', announcementSchema)

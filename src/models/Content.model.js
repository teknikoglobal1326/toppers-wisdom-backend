const mongoose = require('mongoose')

const contantSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  subject: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
  topic: [{ type: mongoose.Schema.Types.ObjectId }],
  chapter: [{ type: mongoose.Schema.Types.ObjectId }],
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  sortOrder: { type: Number, default: 0, index: true },
  type: { type: String, enum: ['video', 'youtube'], default: 'video' },
  video: { type: String, required: function() { return !this.isLive && this.type === 'video'; } },
  youtubeUrl: { type: String, default: null },
  image: { type: String, default: '' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  isDeleted: { type: Boolean, default: false, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isLive: { type: Boolean, default: false },
  liveStatus: { type: String, enum: ['pending', 'ongoing', 'completed'], default: 'pending' },
  agoraChannel: { type: String },
  scheduledStartTime: { type: Date },
  scheduledEndTime: { type: Date },
  scheduleAt: { type: Date, default: null },
  restreamUrls: { type: [String], default: [] },
  agoraConverters: { type: [String], default: [] },
  rtmpServer: { type: String },
  rtmpStreamKey: { type: String },
  rtmpUrl: { type: String },
  agoraToken: { type: String }
}, { timestamps: true })

module.exports = mongoose.model('Contant', contantSchema)
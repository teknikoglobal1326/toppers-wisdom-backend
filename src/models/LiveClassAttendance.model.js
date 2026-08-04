const mongoose = require('mongoose')

const liveClassAttendanceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  content: { type: mongoose.Schema.Types.ObjectId, ref: 'Contant', required: true, index: true },
  joinedAt: { type: Date, default: Date.now, required: true },
  leftAt: { type: Date },
  duration: { type: Number, default: 0 } // in seconds
}, { timestamps: true })

module.exports = mongoose.model('LiveClassAttendance', liveClassAttendanceSchema)

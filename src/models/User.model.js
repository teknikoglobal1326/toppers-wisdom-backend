const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  phone:           { type: String, required: true, unique: true, index: true },
  name:            { type: String, trim: true },
  email:           { type: String, trim: true, lowercase: true },
  language:        { type: String, enum: ['hi', 'en'], default: 'hi' },
  role:            { type: String, enum: ['user', 'admin'], default: 'user', index: true },
  profileComplete: { type: Boolean, default: false },
  profileCompletionState: { type: String, default: 'registered' },
  password:        { type: String },
  plainPassword:   { type: String },
  qualification:   { _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Qualification' }, name: String },
  examType:        { _id: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamType'      }, name: String },
  subExam:         { _id: { type: mongoose.Schema.Types.ObjectId, ref: 'SubExam'       }, name: String },
  exam:            { _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam'          }, name: String },
  subExams: [{ _id: { type: mongoose.Schema.Types.ObjectId, ref: 'SubExam' }, name: String }],
  avatar:          String,
  fcmToken:        String,
  savedItems: [{
    itemType: String,
    itemId:   mongoose.Schema.Types.ObjectId,
    savedAt:  { type: Date, default: Date.now },
  }],
  reportedItems: [{
    itemType:   String,
    itemId:     mongoose.Schema.Types.ObjectId,
    reason:     String,
    reportedAt: { type: Date, default: Date.now },
  }],
  watchDuration: { type: Number, default: 0 },
  isDeleted:     { type: Boolean, default: false, index: true },
  deletedAt:     { type: Date },
}, { timestamps: true })

module.exports = mongoose.model('User', userSchema)
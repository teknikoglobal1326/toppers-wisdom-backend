const mongoose = require('mongoose')

const wrapperPackageSchema = new mongoose.Schema({
  exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
  courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true }],
  image: { type: String, default: null },
  title: { type: String, required: true },
  description: { type: String },
  type: { type: String, enum: ['recorded', 'live', 'free'], default: 'recorded', index: true },
  isFree: { type: Boolean, default: false, index: true },
  mrp: { type: Number, default: 0 },
  price: { type: Number, default: 0 },
  sortOrder: { type: Number, default: 0, index: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  isDeleted: { type: Boolean, default: false, index: true }
}, { timestamps: true })

module.exports = mongoose.model('WrapperPackage', wrapperPackageSchema)

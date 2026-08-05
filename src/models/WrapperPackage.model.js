const mongoose = require('mongoose')

const wrapperPackageSchema = new mongoose.Schema({
  exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
  courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true }],
  image: { type: String, default: null },
  title: { type: String, required: true },
  description: { type: String },
  price: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  isDeleted: { type: Boolean, default: false, index: true }
}, { timestamps: true })

module.exports = mongoose.model('WrapperPackage', wrapperPackageSchema)

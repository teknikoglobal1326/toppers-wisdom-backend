const mongoose = require('mongoose')

// Mapping doc: Course -> Subject(s) -> selected embedded chapter ids -> selected embedded topic ids
// `chapters` and `topics` are bare ObjectIds referencing Subject.chapters[]._id and
// Subject.chapters[].topics[]._id respectively (embedded subdocs, so no ref).
const topicSchema = new mongoose.Schema({
  course:     { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  subjects:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject', index: true }],
  chapters:   [{ type: mongoose.Schema.Types.ObjectId }],
  topics:     [{ type: mongoose.Schema.Types.ObjectId }],
  sortOrder:  { type: Number, default: 0, index: true },
  status:     { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  isDeleted:  { type: Boolean, default: false, index: true },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })


module.exports = mongoose.model('Topic', topicSchema)

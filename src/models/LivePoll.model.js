const mongoose = require('mongoose');

const livePollOptionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  votes: { type: Number, default: 0 }
});

const livePollSchema = new mongoose.Schema({
  content: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true, index: true },
  pollId: { type: String, required: true, unique: true },
  question: { type: String, required: true },
  options: [livePollOptionSchema],
  isActive: { type: Boolean, default: true, index: true },
  voters: [{ type: String }] // Stores user IDs of those who have voted
}, { timestamps: true });

module.exports = mongoose.model('LivePoll', livePollSchema);

const mongoose = require('mongoose');

const dictionaryIngestSchema = new mongoose.Schema({
  type: { type: String, enum: ['word', 'question'], required: true },
  payload: { type: mongoose.Schema.Types.Mixed, required: true }, 
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  aiDraftedFields: [{ type: String }], 
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('DictionaryIngest', dictionaryIngestSchema);

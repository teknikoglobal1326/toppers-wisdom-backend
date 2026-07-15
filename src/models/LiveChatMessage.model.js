const mongoose = require('mongoose');

const liveChatMessageSchema = new mongoose.Schema({
  content: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true, index: true },
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

module.exports = mongoose.model('LiveChatMessage', liveChatMessageSchema);

const mongoose = require('mongoose');

const streakSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  currentStreak: { type: Number, default: 0, index: true },
  longestStreak: { type: Number, default: 0 },
  lastActivityDate: { type: Date },
  tier: { type: Number, default: 1 },
  freezesAvailable: { type: Number, default: 2 },
  freezesUsed: { type: Number, default: 0 },
  streakStatus: { 
    type: String, 
    enum: ['active', 'at_risk', 'frozen', 'broken'], 
    default: 'active',
    index: true 
  },
  totalActiveDays: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Streak', streakSchema);
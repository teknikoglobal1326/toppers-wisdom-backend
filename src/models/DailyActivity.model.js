const mongoose = require('mongoose');

const dailyActivitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: Date, required: true, index: true }, // Normalized to midnight
  missions: {
    'test-series-test': { type: Boolean, default: false },
    pyp_paper: { type: Boolean, default: false },
    pyp_dictionary: { type: Boolean, default: false },
    ai_test: { type: Boolean, default: false }
  },
  assignedTasks: {
    'test-series-test': {
      id: { type: mongoose.Schema.Types.ObjectId },
      title: { type: String }
    },
    pyp_paper: {
      id: { type: mongoose.Schema.Types.ObjectId },
      title: { type: String }
    },
    pyp_dictionary: { 
      id: { type: mongoose.Schema.Types.ObjectId }, 
      title: { type: String } 
    },
    ai_test: {
      id: { type: mongoose.Schema.Types.ObjectId },
      title: { type: String }
    }
  },
  streakMaintained: { type: Boolean, default: false },
  streakSource: { type: String, enum: ['test-series-test', 'pyp_paper', 'pyp_dictionary', 'ai_test', 'none'], default: 'none' },
  coinsEarned: { type: Number, default: 0 }
}, { timestamps: true });

// Ensure one document per user per day
dailyActivitySchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyActivity', dailyActivitySchema);

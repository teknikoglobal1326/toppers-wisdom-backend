const mongoose = require('mongoose');

const dailyActivitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: Date, required: true, index: true }, // Normalized to midnight
  missions: {
    mock_test: { type: Boolean, default: false },
    pyp_paper: { type: Boolean, default: false },
    pyp_dictionary: { type: Boolean, default: false },
    ai_test: { type: Boolean, default: false }
  },
  assignedTasks: {
    mock_test: {
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
  streakSource: { type: String, enum: ['mock_test', 'pyp_paper', 'pyp_dictionary', 'ai_test', 'none'], default: 'none' }
}, { timestamps: true });

// Ensure one document per user per day
dailyActivitySchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyActivity', dailyActivitySchema);

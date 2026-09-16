const mongoose = require('mongoose')

const streakSlabSchema = new mongoose.Schema({
  days: { type: Number, required: true },
  coins: { type: Number, required: true },
  badgeName: { type: String, default: '' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
})

const StreakSlab = mongoose.model('StreakSlab', streakSlabSchema)
module.exports = StreakSlab

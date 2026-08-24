const mongoose = require('mongoose')

const referralHistorySchema = new mongoose.Schema({
  referrer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  referredUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  referralCode: {
    type: String,
    required: true,
  },
  referrerCoinsAwarded: {
    type: Number,
    default: 0,
  },
  referredCoinsAwarded: {
    type: Number,
    default: 0,
  },
}, { timestamps: true })

module.exports = mongoose.model('ReferralHistory', referralHistorySchema)

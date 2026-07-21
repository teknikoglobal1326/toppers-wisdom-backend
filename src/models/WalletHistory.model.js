const mongoose = require('mongoose');

const walletHistorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true },
  transactionType: { type: String, enum: ['credit', 'debit'], required: true },
  source: { type: String, enum: ['signup', 'referral', 'daily_streak', 'other'], required: true },
  description: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('WalletHistory', walletHistorySchema);

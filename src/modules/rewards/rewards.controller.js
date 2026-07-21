const rewardsService = require('./rewards.service');
const User = require('../../models/User.model');

exports.getWalletBalance = async (req, res, next) => {
  try {
    await rewardsService.ensureSignupBonus(req.user._id);
    const user = await User.findById(req.user._id).select('walletBalance totalCoinsEarned');
    res.status(200).json({
      success: true,
      balance: user ? user.walletBalance : 0,
      totalEarned: user ? user.totalCoinsEarned : 0
    });
  } catch (error) {
    next(error);
  }
};

exports.getWalletHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const data = await rewardsService.getWalletHistory(req.user._id, page, limit);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

exports.getWalletSummary = async (req, res, next) => {
  try {
    const data = await rewardsService.getWalletSummary(req.user._id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

exports.getTodayStreak = async (req, res, next) => {
  try {
    const data = await rewardsService.getTodayStreak(req.user._id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

exports.getStreakCalendar = async (req, res, next) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const data = await rewardsService.getStreakCalendar(req.user._id, month, year);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

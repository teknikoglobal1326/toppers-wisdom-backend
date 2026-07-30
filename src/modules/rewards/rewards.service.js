const WalletHistory = require('../../models/WalletHistory.model');
const Streak = require('../../models/Streak.model');
const DailyActivity = require('../../models/DailyActivity.model');
const User = require('../../models/User.model');

class RewardsService {
  async addCoins(userId, amount, source, description, session = null) {
    const user = await User.findById(userId).session(session);
    if (!user) throw new Error('User not found');

    user.walletBalance += amount;
    if (amount > 0) user.totalCoinsEarned += amount;
    
    if (session) {
      await user.save({ session });
    } else {
      await user.save();
    }

    const history = new WalletHistory({
      user: userId,
      amount,
      transactionType: amount > 0 ? 'credit' : 'debit',
      source,
      description
    });
    if (session) {
      await history.save({ session });
    } else {
      await history.save();
    }

    return { balance: user.walletBalance, amountAdded: amount };
  }

  async ensureSignupBonus(userId) {
    const hasSignup = await WalletHistory.exists({ user: userId, source: 'signup' });
    if (!hasSignup) {
      // It's an old user who never got the signup bonus, award it retroactively!
      await this.addCoins(userId, 10, 'signup', 'Sign Up Bonus');
    }
  }

  async getWalletHistory(userId, page = 1, limit = 20) {
    await this.ensureSignupBonus(userId);
    const skip = (page - 1) * limit;
    const history = await WalletHistory.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await WalletHistory.countDocuments({ user: userId });
    return { history, total, page, limit };
  }

  async getWalletSummary(userId) {
    await this.ensureSignupBonus(userId);
    const aggregate = await WalletHistory.aggregate([
      { $match: { user: userId, transactionType: 'credit' } },
      { $group: { _id: '$source', totalCoins: { $sum: '$amount' } } }
    ]);

    const summary = {
      signup: 0,
      daily_streak: 0,
      referral: 0,
      other: 0
    };

    aggregate.forEach(item => {
      if (summary[item._id] !== undefined) {
        summary[item._id] = item.totalCoins;
      }
    });

    const user = await User.findById(userId).select('walletBalance totalCoinsEarned');

    return {
      totalBalance: user ? user.walletBalance : 0,
      // totalEarned: user ? user.totalCoinsEarned : 0,
      sources: summary
    };
  }

  getMidnight(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  async logActivity(userId, activityType) {
    const validActivities = ['mock_test', 'pyp_paper', 'pyp_dictionary', 'ai_test'];
    if (!validActivities.includes(activityType)) return;

    const today = this.getMidnight();
    let activity = await DailyActivity.findOne({ user: userId, date: today });
    
    if (!activity) {
      activity = new DailyActivity({ user: userId, date: today, missions: {} });
    }

    // Mark mission as completed
    activity.missions[activityType] = true;
    activity.streakMaintained = true;
    activity.streakSource = activityType;
    await activity.save();

    // Count unique missions completed today
    const completedCount = ['mock_test', 'pyp_paper', 'pyp_dictionary', 'ai_test'].reduce(
      (count, key) => (activity.missions[key] === true ? count + 1 : count),
      0
    );

    let streak = await Streak.findOne({ user: userId });
    if (!streak) {
      streak = new Streak({ user: userId });
    }

    streak.currentStreak = completedCount;

    if (streak.currentStreak > streak.longestStreak) {
      streak.longestStreak = streak.currentStreak;
    }

    streak.lastActivityDate = new Date();
    streak.tier = 1;

    await streak.save();

    return { streakMaintained: true };
  }

  async getTodayActivity(userId, today) {
    let activity = await DailyActivity.findOne({ user: userId, date: today });
    if (!activity) {
      activity = new DailyActivity({
        user: userId,
        date: today,
        missions: {
          mock_test: false,
          pyp_paper: false,
          pyp_dictionary: false,
          ai_test: false
        }
      });
      await activity.save();
    }
    return activity;
  }

  async getTodayStreak(userId) {
    const today = this.getMidnight();
    const activity = await this.getTodayActivity(userId, today);
    const streak = await Streak.findOne({ user: userId });

    // Streak count is purely the count of completed missions today.
    const completedCount = ['mock_test', 'pyp_paper', 'pyp_dictionary', 'ai_test'].reduce(
      (count, key) => (activity.missions[key] === true ? count + 1 : count),
      0
    );

    const missions = {
      mock_test: activity.missions.mock_test,
      pyp_paper: activity.missions.pyp_paper,
      pyp_dictionary: activity.missions.pyp_dictionary,
      ai_test: activity.missions.ai_test
    };

    return {
      currentStreak: completedCount,
      tier: streak ? streak.tier : 1,
      todayMissions: missions,
      streakMaintainedToday: activity.streakMaintained,
      streakSource: activity.streakSource
    };
  }
}

module.exports = new RewardsService();

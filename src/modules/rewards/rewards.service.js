const WalletHistory = require('../../models/WalletHistory.model');
const Streak = require('../../models/Streak.model');
const DailyActivity = require('../../models/DailyActivity.model');
const User = require('../../models/User.model');
const moment = require('moment'); // Assuming moment is installed, else can use native Date

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

    // If this mission was already completed today, just return
    if (activity.missions[activityType]) return { streakMaintained: activity.streakMaintained };

    // Mark mission as completed
    activity.missions[activityType] = true;

    // If streak wasn't maintained yet today, maintain it and award coins
    let coinsAwarded = 0;
    if (!activity.streakMaintained) {
      activity.streakMaintained = true;
      activity.streakSource = activityType;

      let streak = await Streak.findOne({ user: userId });
      if (!streak) {
        streak = new Streak({ user: userId });
      }

      const yesterday = this.getMidnight(new Date(Date.now() - 86400000));
      const lastActiveDate = streak.lastActivityDate ? this.getMidnight(streak.lastActivityDate) : null;

      if (lastActiveDate && lastActiveDate.getTime() === yesterday.getTime()) {
        streak.currentStreak += 1;
      } else if (!lastActiveDate || lastActiveDate.getTime() < yesterday.getTime()) {
        streak.currentStreak = 1; // Reset streak
      }
      
      if (streak.currentStreak > streak.longestStreak) {
        streak.longestStreak = streak.currentStreak;
      }

      streak.lastActivityDate = new Date();
      
      // Determine tier (e.g. Month 1 -> tier 1, Month 2 -> tier 2)
      streak.tier = Math.ceil(streak.currentStreak / 30) || 1;

      await streak.save();

      // Hitting a milestone (30 days, 60 days, etc.) gives a lump sum bonus.
      // Month 1 (30 days) -> 25 coins. Month 2 (60 days) -> 50 coins. Month N -> 25 * N coins.
      if (streak.currentStreak > 0 && streak.currentStreak % 30 === 0) {
        const milestoneTier = streak.currentStreak / 30;
        coinsAwarded = milestoneTier * 25;
        await this.addCoins(userId, coinsAwarded, 'daily_streak', `Daily Streak Milestone (Month ${milestoneTier})`);
      }
    }

    await activity.save();

    return { streakMaintained: true, coinsAwarded };
  }

  async getTodayStreak(userId) {
    const today = this.getMidnight();
    const activity = await DailyActivity.findOne({ user: userId, date: today });
    const streak = await Streak.findOne({ user: userId });

    const missions = {
      mock_test: false,
      pyp_paper: false,
      pyp_dictionary: false,
      ai_test: false,
      ...(activity ? activity.missions : {})
    };

    return {
      currentStreak: streak ? streak.currentStreak : 0,
      tier: streak ? streak.tier : 1,
      todayMissions: missions,
      streakMaintainedToday: activity ? activity.streakMaintained : false,
      streakSource: activity ? activity.streakSource : 'none'
    };
  }

  async getStreakCalendar(userId, month, year) {
    // Return daily activity for a specific month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // last day of month

    const activities = await DailyActivity.find({
      user: userId,
      date: { $gte: startDate, $lte: endDate }
    }).select('date streakMaintained streakSource');

    return activities;
  }
}

module.exports = new RewardsService();

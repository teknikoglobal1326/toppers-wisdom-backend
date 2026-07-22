const WalletHistory = require('../../models/WalletHistory.model');
const Streak = require('../../models/Streak.model');
const DailyActivity = require('../../models/DailyActivity.model');
const User = require('../../models/User.model');
const VocabularyUserState = require('../../models/VocabularyUserState.model');

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

    // Increment currentStreak for every unique completed mission
    let coinsAwarded = 0;
    let streak = await Streak.findOne({ user: userId });
    if (!streak) {
      streak = new Streak({ user: userId });
    }

    const yesterday = this.getMidnight(new Date(Date.now() - 86400000));
    const lastActiveDate = streak.lastActivityDate ? this.getMidnight(streak.lastActivityDate) : null;

    if (lastActiveDate && (lastActiveDate.getTime() === yesterday.getTime() || lastActiveDate.getTime() === today.getTime())) {
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

    // Set streak maintenance status if not already set today
    if (!activity.streakMaintained) {
      activity.streakMaintained = true;
      activity.streakSource = activityType;
    }

    await activity.save();

    return { streakMaintained: true, coinsAwarded };
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

    const missions = {
      mock_test: activity.missions.mock_test,
      pyp_paper: activity.missions.pyp_paper,
      pyp_dictionary: activity.missions.pyp_dictionary,
      ai_test: activity.missions.ai_test
    };

    return {
      currentStreak: streak ? streak.currentStreak : 0,
      tier: streak ? streak.tier : 1,
      todayMissions: missions,
      streakMaintainedToday: activity.streakMaintained,
      streakSource: activity.streakSource
    };
  }

  async completeMission(userId, activityType) {
    if (activityType !== 'pyp_dictionary') {
      throw new Error('Only the vocabulary mission requires manual completion. Tests are updated automatically.');
    }

    const today = this.getMidnight();
    const activity = await this.getTodayActivity(userId, today);

    // If already completed, just return
    if (activity.missions.pyp_dictionary) {
      return { success: true, streakMaintained: activity.streakMaintained, alreadyCompleted: true };
    }

    const startOfToday = today;
    const endOfToday = new Date(startOfToday);
    endOfToday.setHours(23, 59, 59, 999);

    // Check vocabulary read count today
    const count = await VocabularyUserState.countDocuments({
      user: userId,
      isRead: true,
      readAt: { $gte: startOfToday, $lte: endOfToday }
    });
    if (count < 30) {
      throw new Error(`You must read at least 30 vocabulary words to complete this mission. Today you have read: ${count}`);
    }

    const result = await this.logActivity(userId, 'pyp_dictionary');
    return { success: true, ...result };
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

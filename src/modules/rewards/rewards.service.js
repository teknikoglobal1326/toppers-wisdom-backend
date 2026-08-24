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

  getYesterday() {
    const d = this.getMidnight();
    d.setDate(d.getDate() - 1);
    return d;
  }

  async logActivity(userId, activityType) {
    const validActivities = ['test-series-test', 'pyp_paper', 'pyp_dictionary', 'ai_test'];
    if (!validActivities.includes(activityType)) return;

    const today = this.getMidnight();
    const yesterday = this.getYesterday();

    let activity = await DailyActivity.findOne({ user: userId, date: today });
    let isFirstActivityToday = false;

    if (!activity) {
      activity = new DailyActivity({
        user: userId,
        date: today,
        missions: {
          'test-series-test': false,
          pyp_paper: false,
          pyp_dictionary: false,
          ai_test: false
        },
        coinsEarned: 0
      });
      isFirstActivityToday = true;
    } else {
      const completedBefore = ['test-series-test', 'pyp_paper', 'pyp_dictionary', 'ai_test'].some(
        key => activity.missions[key] === true
      );
      if (!completedBefore) {
        isFirstActivityToday = true;
      }
    }

    // Mark mission as completed
    activity.missions[activityType] = true;
    activity.streakMaintained = true;
    activity.streakSource = activityType;

    // Award coins
    if (isFirstActivityToday) {
      if (activity.coinsEarned < 1) {
        const coinsToAdd = 1 - activity.coinsEarned;
        activity.coinsEarned = 1;
        await this.addCoins(userId, coinsToAdd, 'daily_streak', 'Completed first daily activity');
      }
    }

    // Count unique missions completed today
    const completedCount = ['test-series-test', 'pyp_paper', 'pyp_dictionary', 'ai_test'].reduce(
      (count, key) => (activity.missions[key] === true ? count + 1 : count),
      0
    );

    // If all 4 missions are completed today, award the 1.5 coin total
    if (completedCount === 4) {
      if (activity.coinsEarned < 1.5) {
        const coinsToAdd = 1.5 - activity.coinsEarned;
        activity.coinsEarned = 1.5;
        await this.addCoins(userId, coinsToAdd, 'daily_streak', 'Completed all daily activities');
      }
    }

    await activity.save();

    // Manage daily consecutive streak
    let streak = await Streak.findOne({ user: userId });
    if (!streak) {
      streak = new Streak({ user: userId, currentStreak: 0, longestStreak: 0 });
    }

    if (isFirstActivityToday) {
      if (streak.lastActivityDate) {
        const lastActMidnight = this.getMidnight(streak.lastActivityDate);
        if (lastActMidnight.getTime() === yesterday.getTime()) {
          // Continued yesterday's streak
          streak.currentStreak += 1;
        } else if (lastActMidnight.getTime() === today.getTime()) {
          // Already counted today, do nothing
        } else {
          // Streak broken
          streak.currentStreak = 1;
        }
      } else {
        // First ever activity
        streak.currentStreak = 1;
      }

      streak.lastActivityDate = new Date();
      if (streak.currentStreak > streak.longestStreak) {
        streak.longestStreak = streak.currentStreak;
      }
      streak.tier = 1;
      await streak.save();
    }

    return { streakMaintained: true };
  }

  async getTodayActivity(userId, today) {
    let activity = await DailyActivity.findOne({ user: userId, date: today });
    if (!activity) {
      activity = new DailyActivity({
        user: userId,
        date: today,
        missions: {
          'test-series-test': false,
          pyp_paper: false,
          pyp_dictionary: false,
          ai_test: false
        },
        coinsEarned: 0
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
      'test-series-test': activity.missions ? activity.missions['test-series-test'] : false,
      pyp_paper: activity.missions ? activity.missions.pyp_paper : false,
      pyp_dictionary: activity.missions ? activity.missions.pyp_dictionary : false,
      ai_test: activity.missions ? activity.missions.ai_test : false
    };

    // Calculate current month's total earned coins
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const walletHistoryCredits = await WalletHistory.find({
      user: userId,
      transactionType: 'credit',
      createdAt: { $gte: startOfMonth }
    }).select('amount').lean();
    const currentMonthTotalEarnedCoins = walletHistoryCredits.reduce((sum, item) => sum + (item.amount || 0), 0);

    let currentStreakCount = streak ? streak.currentStreak : 0;
    if (streak && !activity.streakMaintained) {
      if (streak.lastActivityDate) {
        const lastActMidnight = this.getMidnight(streak.lastActivityDate);
        const yesterday = this.getYesterday();
        if (lastActMidnight.getTime() < yesterday.getTime()) {
          currentStreakCount = 0;
        }
      } else {
        currentStreakCount = 0;
      }
    }

    return {
      currentStreak: currentStreakCount,
      longestStreak: streak ? streak.longestStreak : 0,
      tier: streak ? streak.tier : 1,
      currentTier: streak ? streak.tier : 1,
      todayMissions: missions,
      streakMaintainedToday: activity.streakMaintained,
      streakSource: activity.streakSource,
      coinsEarnedToday: activity.coinsEarned || 0,
      currentMonthTotalEarnedCoins
    };
  }

  async getCalendarHistory(userId, year, month) {
    const today = this.getMidnight();
    const now = new Date();
    const targetYear = year !== undefined ? Number(year) : now.getFullYear();
    const targetMonth = month !== undefined ? Number(month) - 1 : now.getMonth();

    if (targetYear === today.getFullYear() && targetMonth === today.getMonth()) {
      await this.getTodayActivity(userId, today);
    }

    const start = new Date(targetYear, targetMonth, 1);
    const end = new Date(targetYear, targetMonth + 1, 1);

    const activities = await DailyActivity.find({
      user: userId,
      date: { $gte: start, $lt: end }
    }).sort({ date: 1 }).lean();

    const currentMonthCalendar = activities.map(act => {
      const localDate = new Date(act.date);
      const utcMidnight = new Date(Date.UTC(localDate.getFullYear(), localDate.getMonth(), localDate.getDate()));
      return {
        date: utcMidnight,
        missions: {
          'test-series-test': act.missions ? act.missions['test-series-test'] : false,
          pyp_paper: act.missions ? act.missions.pyp_paper : false,
          pyp_dictionary: act.missions ? act.missions.pyp_dictionary : false,
          ai_test: act.missions ? act.missions.ai_test : false
        },
        streakMaintained: act.streakMaintained,
        coinsEarned: act.coinsEarned || 0
      };
    });

    const streak = await Streak.findOne({ user: userId });
    
    let currentStreakCount = streak ? streak.currentStreak : 0;
    if (streak) {
      const today = this.getMidnight();
      const todayActivity = await DailyActivity.findOne({ user: userId, date: today });
      const streakMaintained = todayActivity ? todayActivity.streakMaintained : false;
      if (!streakMaintained) {
        if (streak.lastActivityDate) {
          const lastActMidnight = this.getMidnight(streak.lastActivityDate);
          const yesterday = this.getYesterday();
          if (lastActMidnight.getTime() < yesterday.getTime()) {
            currentStreakCount = 0;
          }
        } else {
          currentStreakCount = 0;
        }
      }
    }

    const activeStreak = {
      currentStreak: currentStreakCount,
      longestStreak: streak ? streak.longestStreak : 0,
      tier: streak ? streak.tier : 1
    };

    const last6MonthsStreak = [];
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    for (let i = 0; i < 6; i++) {
      const mDate = new Date();
      mDate.setMonth(now.getMonth() - i);
      const mYear = mDate.getFullYear();
      const mMonth = mDate.getMonth();

      const mStart = new Date(mYear, mMonth, 1);
      const mEnd = new Date(mYear, mMonth + 1, 1);

      const count = await DailyActivity.countDocuments({
        user: userId,
        streakMaintained: true,
        date: { $gte: mStart, $lt: mEnd }
      });

      const monthActivities = await DailyActivity.find({
        user: userId,
        date: { $gte: mStart, $lt: mEnd }
      }).select('coinsEarned').lean();
      const earnCoin = monthActivities.reduce((sum, act) => sum + (act.coinsEarned || 0), 0);

      last6MonthsStreak.push({
        monthName: monthNames[mMonth],
        monthValue: mMonth + 1,
        year: mYear,
        streakCount: count,
        earnCoin
      });
    }

    return {
      currentMonthCalendar,
      activeStreak,
      last6MonthsStreak
    };
  }
}

module.exports = new RewardsService();

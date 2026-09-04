const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendPaginated } = require('../../core/response')
const Streak = require('../../models/Streak.model')
const User = require('../../models/User.model')
const DailyActivity = require('../../models/DailyActivity.model')
const WalletHistory = require('../../models/WalletHistory.model')

class AdminStreakController {
  listAll = catchAsync(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1
    const limit = parseInt(req.query.limit, 10) || 20
    const skip = (page - 1) * limit
    const search = req.query.search ? req.query.search.trim() : ''
    const status = req.query.status ? req.query.status.trim() : ''
    const tier = req.query.tier ? req.query.tier.trim() : ''

    // Match criteria
    const userMatch = { isDeleted: false }
    if (search) {
      userMatch['$or'] = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }

    // Aggregation pipeline to ensure every user has a streak view
    const pipeline = [
      { $match: userMatch },
      {
        $lookup: {
          from: 'streaks',
          localField: '_id',
          foreignField: 'user',
          as: 'streakData'
        }
      },
      {
        $unwind: {
          path: '$streakData',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: { $ifNull: ['$streakData._id', '$_id'] },
          userId: '$_id',
          user: {
            _id: '$_id',
            name: { $ifNull: ['$name', 'Unnamed User'] },
            phone: { $ifNull: ['$phone', ''] },
            email: '$email',
            avatar: '$avatar',
            targetExam: '$exam.name'
          },
          currentStreak: { $ifNull: ['$streakData.currentStreak', 0] },
          longestStreak: { $ifNull: ['$streakData.longestStreak', 0] },
          tier: { $ifNull: ['$streakData.tier', 1] },
          totalActiveDays: {
            $max: [
              { $ifNull: ['$streakData.totalActiveDays', 0] },
              { $ifNull: ['$streakData.longestStreak', 0] },
              { $ifNull: ['$streakData.currentStreak', 0] }
            ]
          },
          freezesAvailable: { $ifNull: ['$streakData.freezesAvailable', 2] },
          freezesUsed: { $ifNull: ['$streakData.freezesUsed', 0] },
          streakStatus: {
            $switch: {
              branches: [
                { case: { $eq: ['$streakData.streakStatus', 'frozen'] }, then: 'frozen' },
                { case: { $gt: [{ $ifNull: ['$streakData.currentStreak', 0] }, 0] }, then: 'active' },
                { case: { $eq: [{ $ifNull: ['$streakData.currentStreak', 0] }, 0] }, then: 'broken' }
              ],
              default: 'active'
            }
          },
          lastActiveDate: { $ifNull: ['$streakData.lastActivityDate', '$updatedAt'] },
          createdAt: '$createdAt',
          updatedAt: '$updatedAt'
        }
      }
    ]

    if (status) {
      pipeline.push({ $match: { streakStatus: status } })
    }

    if (tier) {
      if (tier === 'tier_1') pipeline.push({ $match: { currentStreak: { $gte: 1, $lte: 7 } } })
      if (tier === 'tier_2') pipeline.push({ $match: { currentStreak: { $gte: 8, $lte: 30 } } })
      if (tier === 'tier_3') pipeline.push({ $match: { currentStreak: { $gt: 30, $lte: 60 } } })
      if (tier === 'tier_4') pipeline.push({ $match: { currentStreak: { $gt: 60 } } })
    }

    // Count total matches
    const countPipeline = [...pipeline, { $count: 'total' }]
    const countResult = await User.aggregate(countPipeline)
    const total = countResult[0] ? countResult[0].total : 0

    // Sorting and Pagination
    pipeline.push({ $sort: { currentStreak: -1, lastActiveDate: -1 } })
    pipeline.push({ $skip: skip })
    pipeline.push({ $limit: limit })

    const data = await User.aggregate(pipeline)

    // Global Stats for top summary cards
    const globalStats = await Streak.aggregate([
      {
        $group: {
          _id: null,
          globalActive: { $sum: { $cond: [{ $gt: ['$currentStreak', 0] }, 1, 0] } },
          maxStreak: { $max: '$longestStreak' },
          globalFrozen: { $sum: { $cond: [{ $eq: ['$streakStatus', 'frozen'] }, 1, 0] } }
        }
      }
    ]).catch(() => [])

    return sendPaginated(res, data, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      globalActive: globalStats[0]?.globalActive || 0,
      globalAtRisk: 0,
      globalFrozen: globalStats[0]?.globalFrozen || 0,
      maxStreak: globalStats[0]?.maxStreak || 0
    })
  })

  getDetails = catchAsync(async (req, res) => {
    const { id } = req.params

    let streak = await Streak.findById(id).populate('user', 'name phone email avatar exam subExams qualification walletBalance totalCoinsEarned')
    if (!streak) {
      streak = await Streak.findOne({ user: id }).populate('user', 'name phone email avatar exam subExams qualification walletBalance totalCoinsEarned')
    }

    let user = streak?.user
    if (!user) {
      user = await User.findById(id).select('name phone email avatar exam subExams qualification walletBalance totalCoinsEarned')
    }

    const userId = user ? user._id : id

    // Fetch 30-day activity logs from DailyActivity
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const activities = await DailyActivity.find({
      user: userId,
      date: { $gte: thirtyDaysAgo }
    }).sort({ date: 1 })

    // Generate complete 30-day array
    const history = []
    const now = new Date()
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      d.setHours(0, 0, 0, 0)
      const dIso = d.toISOString().split('T')[0]



































      

      const found = activities.find(a => a.date && a.date.toISOString().split('T')[0] === dIso)
      if (found) {
        const completedMissions = ['mock_test', 'pyp_paper', 'pyp_dictionary', 'ai_test'].reduce(
          (sum, k) => (found.missions && found.missions[k] ? sum + 1 : sum),
          0
        )
        history.push({
          date: dIso,
          testsCompleted: completedMissions,
          minutesSpent: completedMissions * 20,
          status: found.streakMaintained ? 'completed' : 'missed'
        })
      } else {
        history.push({
          date: dIso,
          testsCompleted: 0,
          minutesSpent: 0,
          status: 'missed'
        })
      }
    }

    // Milestones Calculation
    const currentStreak = streak ? streak.currentStreak : 0
    const milestones = [
      { days: 7, rewardCoins: 50, badgeName: '7-Day Ignition 🔥', achieved: currentStreak >= 7 },
      { days: 14, rewardCoins: 100, badgeName: '14-Day Blaze ⚡', achieved: currentStreak >= 14 },
      { days: 30, rewardCoins: 250, badgeName: '30-Day Legend 🏆', achieved: currentStreak >= 30 },
      { days: 60, rewardCoins: 500, badgeName: '60-Day Titan 👑', achieved: currentStreak >= 60 },
      { days: 100, rewardCoins: 1000, badgeName: '100-Day Grandmaster 🌟', achieved: currentStreak >= 100 }
    ]

    // Wallet coins from daily streak source
    const walletSum = await WalletHistory.aggregate([
      { $match: { user: userId, source: 'daily_streak', transactionType: 'credit' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ])
    const coinsEarnedFromStreak = walletSum[0]?.total || 0

    const result = {
      _id: streak?._id || id,
      userId: user?._id || id,
      user: {
        _id: user?._id || id,
        name: user?.name || 'Unnamed User',
        phone: user?.phone || '',
        email: user?.email || '',
        avatar: user?.avatar,
        targetExam: user?.exam?.name || user?.subExams?.[0]?.name || ''
      },
      currentStreak: streak ? streak.currentStreak : 0,
      longestStreak: streak ? streak.longestStreak : 0,
      totalActiveDays: (streak && streak.totalActiveDays > 0) ? streak.totalActiveDays : Math.max(streak ? streak.currentStreak : 0, streak ? streak.longestStreak : 0),
      freezesAvailable: streak ? streak.freezesAvailable : 2,
      freezesUsed: streak ? streak.freezesUsed : 0,
      streakStatus: streak ? streak.streakStatus : 'active',
      lastActiveDate: streak ? streak.lastActivityDate : new Date(),
      coinsEarnedFromStreak,
      history,
      milestones,
      createdAt: streak?.createdAt || user?.createdAt,
      updatedAt: streak?.updatedAt || user?.updatedAt
    }

    return sendSuccess(res, result, 'Streak details fetched successfully')
  })

  grantFreeze = catchAsync(async (req, res) => {
    const { id } = req.params
    let streak = await Streak.findById(id)
    if (!streak) {
      streak = await Streak.findOne({ user: id })
    }

    if (!streak) {
      streak = new Streak({ user: id, freezesAvailable: 3 })
    } else {
      streak.freezesAvailable = (streak.freezesAvailable || 0) + 1
    }

    await streak.save()
    return sendSuccess(res, streak, 'Freeze shield granted successfully')
  })

  resetStreak = catchAsync(async (req, res) => {
    const { id } = req.params
    let streak = await Streak.findById(id)
    if (!streak) {
      streak = await Streak.findOne({ user: id })
    }

    if (streak) {
      streak.currentStreak = 0
      streak.streakStatus = 'broken'
      await streak.save()
    }

    return sendSuccess(res, streak, 'User streak reset to 0')
  })
}

module.exports = new AdminStreakController()

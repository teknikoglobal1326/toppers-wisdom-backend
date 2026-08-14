const User = require('../../models/User.model')
const Course = require('../../models/Course.model')
const TestSeries = require('../../models/TestSeries.model')
const Content = require('../../models/Content.model')
const { createLogger } = require('../../config/logger')

const logger = createLogger('admin:dashboard:service')

const getDashboardStats = async () => {
  logger.info('Fetching admin dashboard stats')
  
  const startOfToday = new Date()
  startOfToday.setUTCHours(0, 0, 0, 0)
  const endOfToday = new Date()
  endOfToday.setUTCHours(23, 59, 59, 999)

  const [totalUsers, totalCourses, totalTestSeries, todayLiveClasses] = await Promise.all([
    User.countDocuments({ isDeleted: false }),
    Course.countDocuments({ isDeleted: false }),
    TestSeries.countDocuments({ isDeleted: false }),
    Content.countDocuments({
      isLive: true,
      isDeleted: false,
      status: 'active',
      scheduledStartTime: { $gte: startOfToday, $lte: endOfToday }
    })
  ])

  return {
    totalUsers,
    totalCourses,
    totalTestSeries,
    todayLiveClasses
  }
}

module.exports = {
  getDashboardStats
}

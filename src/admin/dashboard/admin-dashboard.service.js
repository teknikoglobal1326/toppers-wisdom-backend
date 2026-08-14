const User = require('../../models/User.model')
const Course = require('../../models/Course.model')
const TestSeries = require('../../models/TestSeries.model')
const Content = require('../../models/Content.model')
const Enrollment = require('../../models/Enrollment.model')
const CourseOrder = require('../../models/CourseOrder.model')
const SubscriptionOrder = require('../../models/SubscriptionOrder.model')
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

const getEnrollmentStats = async (query = {}) => {
  logger.info({ query }, 'Fetching admin dashboard daily enrollment stats')

  const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  const defaultYear = nowIST.getFullYear()
  const defaultMonth = nowIST.getMonth() + 1 // 1-indexed
  const defaultHalf = nowIST.getDate() <= 15 ? 1 : 2

  const year = Number(query.year) || defaultYear
  const month = Number(query.month) || defaultMonth
  const half = Number(query.half) || defaultHalf

  const startDay = half === 1 ? 1 : 16
  const endDay = half === 1 ? 15 : new Date(year, month, 0).getDate()

  const startIsoString = `${year}-${String(month).padStart(2, '0')}-${String(startDay).padStart(2, '0')}T00:00:00.000+05:30`
  const endIsoString = `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}T23:59:59.999+05:30`

  const startDate = new Date(startIsoString)
  const endDate = new Date(endIsoString)

  const enrollments = await Enrollment.aggregate([
    {
      $match: {
        enrolledAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: { $dayOfMonth: { date: "$enrolledAt", timezone: "Asia/Kolkata" } },
        count: { $sum: 1 }
      }
    }
  ])

  const statsMap = new Map(enrollments.map(item => [item._id, item.count]))

  const dailyStats = []
  for (let day = startDay; day <= endDay; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    dailyStats.push({
      date: dateStr,
      day,
      count: statsMap.get(day) || 0
    })
  }

  return {
    year,
    month,
    half,
    dailyStats
  }
}

const getRevenueStats = async (query = {}) => {
  logger.info({ query }, 'Fetching admin dashboard daily revenue stats')

  const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  const defaultYear = nowIST.getFullYear()
  const defaultMonth = nowIST.getMonth() + 1 // 1-indexed
  const defaultHalf = nowIST.getDate() <= 15 ? 1 : 2

  const year = Number(query.year) || defaultYear
  const month = Number(query.month) || defaultMonth
  const half = Number(query.half) || defaultHalf

  const startDay = half === 1 ? 1 : 16
  const endDay = half === 1 ? 15 : new Date(year, month, 0).getDate()

  const startIsoString = `${year}-${String(month).padStart(2, '0')}-${String(startDay).padStart(2, '0')}T00:00:00.000+05:30`
  const endIsoString = `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}T23:59:59.999+05:30`

  const startDate = new Date(startIsoString)
  const endDate = new Date(endIsoString)

  const [courseOrders, subscriptionOrders] = await Promise.all([
    CourseOrder.aggregate([
      {
        $match: {
          status: 'paid',
          paidAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $dayOfMonth: { date: "$paidAt", timezone: "Asia/Kolkata" } },
          count: { $sum: 1 },
          amount: { $sum: "$totalAmount" }
        }
      }
    ]),
    SubscriptionOrder.aggregate([
      {
        $match: {
          status: 'paid',
          paidAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $dayOfMonth: { date: "$paidAt", timezone: "Asia/Kolkata" } },
          count: { $sum: 1 },
          amount: { $sum: "$amount" }
        }
      }
    ])
  ])

  const courseMap = new Map(courseOrders.map(item => [item._id, { count: item.count, amount: item.amount }]))
  const subMap = new Map(subscriptionOrders.map(item => [item._id, { count: item.count, amount: item.amount }]))

  const dailyStats = []
  for (let day = startDay; day <= endDay; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    
    const courseInfo = courseMap.get(day) || { count: 0, amount: 0 }
    const subInfo = subMap.get(day) || { count: 0, amount: 0 }
    
    dailyStats.push({
      date: dateStr,
      day,
      courseEnrollmentCount: courseInfo.count,
      courseEnrollmentRevenue: Number(courseInfo.amount.toFixed(2)),
      subscriptionCount: subInfo.count,
      subscriptionRevenue: Number(subInfo.amount.toFixed(2)),
      totalRevenue: Number((courseInfo.amount + subInfo.amount).toFixed(2))
    })
  }

  return {
    year,
    month,
    half,
    dailyStats
  }
}

const getUpcomingLiveClasses = async () => {
  logger.info('Fetching upcoming live classes for dashboard')

  // Require models
  require('../../models/Subject.model')
  const Enrollment = require('../../models/Enrollment.model')

  const startOfToday = new Date()
  startOfToday.setUTCHours(0, 0, 0, 0)

  const liveClasses = await Content.find({
    isLive: true,
    isDeleted: false,
    status: 'active',
    scheduledStartTime: { $gte: startOfToday }
  })
    .sort({ scheduledStartTime: 1 })
    .limit(5)
    .populate({
      path: 'course',
      select: 'title totalEnrollments type'
    })
    .populate({
      path: 'subject',
      select: 'name'
    })
    .lean()

  const result = await Promise.all(
    liveClasses.map(async (item) => {
      const courseId = item.course?._id
      const enrollmentCount = courseId
        ? await Enrollment.countDocuments({ course: courseId })
        : 0

      return {
        id: item._id,
        name: item.title,
        time: item.scheduledStartTime,
        totalEnrollmentCount: enrollmentCount || item.course?.totalEnrollments || 0,
        courseName: item.course?.title || null,
        subjectName: Array.isArray(item.subject) ? item.subject.map(s => s.name).filter(Boolean).join(', ') : ''
      }
    })
  )

  return result
}

module.exports = {
  getDashboardStats,
  getEnrollmentStats,
  getRevenueStats,
  getUpcomingLiveClasses
}

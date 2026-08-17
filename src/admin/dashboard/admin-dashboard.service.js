const User = require('../../models/User.model')
const Course = require('../../models/Course.model')
const TestSeries = require('../../models/TestSeries.model')
const Content = require('../../models/Content.model')
const Enrollment = require('../../models/Enrollment.model')
const CourseOrder = require('../../models/CourseOrder.model')
const SubscriptionOrder = require('../../models/SubscriptionOrder.model')
const Subscription = require('../../models/Subscription.model')
const Book = require('../../models/Book.model')
const PreviousYearPaper = require('../../models/PreviousYearPaper.model')
const DailyQuiz = require('../../models/DailyQuiz.model')
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

const getTopExamsByStudentCount = async () => {
  logger.info('Fetching top 7 exams by student count')

  const topExams = await User.aggregate([
    {
      $match: {
        isDeleted: false,
        'exam._id': { $ne: null }
      }
    },
    {
      $group: {
        _id: '$exam._id',
        studentCount: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: 'exams',
        localField: '_id',
        foreignField: '_id',
        as: 'examInfo'
      }
    },
    {
      $unwind: '$examInfo'
    },
    {
      $match: {
        'examInfo.is_deleted': { $ne: true },
        'examInfo.status': 'active'
      }
    },
    {
      $sort: { studentCount: -1 }
    },
    {
      $limit: 7
    },
    {
      $project: {
        _id: 0,
        examId: '$_id',
        examName: '$examInfo.name',
        studentCount: 1
      }
    }
  ])

  return topExams
}

const getCategorizedEnrollments = async () => {
  logger.info('Fetching paid enrollments categorized by Course, Test Series, and Subscription')

  // 1. Fetch paid course orders and paid subscription orders
  const [paidOrders, paidSubOrders] = await Promise.all([
    CourseOrder.find({ status: 'paid' }).lean(),
    SubscriptionOrder.find({ status: 'paid' }).lean()
  ])

  const coursePurchaseCount = {}
  const testPurchaseCount = {}
  const subPurchaseCount = {}

  // Tally CourseOrders
  for (const order of paidOrders) {
    for (const item of order.items || []) {
      if (!item.itemId) continue
      const itemIdStr = item.itemId.toString()
      if (item.itemType === 'course') {
        coursePurchaseCount[itemIdStr] = (coursePurchaseCount[itemIdStr] || 0) + 1
      } else if (item.itemType === 'test') {
        testPurchaseCount[itemIdStr] = (testPurchaseCount[itemIdStr] || 0) + 1
      }
    }
  }

  // Tally SubscriptionOrders
  for (const order of paidSubOrders) {
    if (!order.subscription) continue
    const subIdStr = order.subscription.toString()
    subPurchaseCount[subIdStr] = (subPurchaseCount[subIdStr] || 0) + 1
  }

  // 2. Resolve items from DB to verify existence and get names
  const courseIds = Object.keys(coursePurchaseCount)
  const testSeriesIds = Object.keys(testPurchaseCount)
  const subIds = Object.keys(subPurchaseCount)

  const [courses, testSeriesList, subscriptions] = await Promise.all([
    Course.find({ _id: { $in: courseIds } }).select('_id title').lean(),
    TestSeries.find({ _id: { $in: testSeriesIds } }).select('_id title').lean(),
    Subscription.find({ _id: { $in: subIds } }).select('_id name').lean()
  ])

  // Course tally
  let totalCourseEnrollments = 0
  let topCourseItem = null
  for (const c of courses) {
    const count = coursePurchaseCount[c._id.toString()] || 0
    totalCourseEnrollments += count
    if (!topCourseItem || count > topCourseItem.enrollmentCount) {
      topCourseItem = {
        id: c._id.toString(),
        title: c.title,
        enrollmentCount: count
      }
    }
  }

  // Test Series tally
  let totalTestSeriesEnrollments = 0
  let topTestSeriesItem = null
  for (const ts of testSeriesList) {
    const count = testPurchaseCount[ts._id.toString()] || 0
    totalTestSeriesEnrollments += count
    if (!topTestSeriesItem || count > topTestSeriesItem.enrollmentCount) {
      topTestSeriesItem = {
        id: ts._id.toString(),
        title: ts.title,
        enrollmentCount: count
      }
    }
  }

  // Subscription tally
  let totalSubEnrollments = 0
  let topSubItem = null
  for (const s of subscriptions) {
    const count = subPurchaseCount[s._id.toString()] || 0
    totalSubEnrollments += count
    if (!topSubItem || count > topSubItem.enrollmentCount) {
      topSubItem = {
        id: s._id.toString(),
        title: s.name,
        enrollmentCount: count
      }
    }
  }

  const result = [
    {
      category: 'Course',
      enrollmentCount: totalCourseEnrollments,
      topItem: topCourseItem
    },
    {
      category: 'Subscription',
      enrollmentCount: totalSubEnrollments,
      topItem: topSubItem
    }
  ]

  if (totalTestSeriesEnrollments > 0) {
    result.push({
      category: 'Test Series',
      enrollmentCount: totalTestSeriesEnrollments,
      topItem: topTestSeriesItem
    })
  }

  // Sort descending by enrollmentCount
  result.sort((a, b) => b.enrollmentCount - a.enrollmentCount)
  return result
}

const getDashboardCounts = async () => {
  logger.info('Fetching admin dashboard total counts')

  const [totalCourses, totalBooks, totalTestSeries, totalPreviousYearPapers, totalDailyQuizzes] = await Promise.all([
    Course.countDocuments({ isDeleted: false }),
    Book.countDocuments({ isDeleted: false }),
    TestSeries.countDocuments({ isDeleted: false }),
    PreviousYearPaper.countDocuments({ isDeleted: false }),
    DailyQuiz.countDocuments({ isDeleted: false })
  ])

  return {
    totalCourses,
    totalBooks,
    totalTestSeries,
    totalPreviousYearPapers,
    totalDailyQuizzes
  }
}

const getRecentActivities = async () => {
  logger.info('Fetching admin dashboard recent activity')

  const [recentCourseOrders, recentSubscriptionOrders, recentEnrollments] = await Promise.all([
    CourseOrder.find({ status: 'paid',  })
      .sort({ paidAt: -1 })
      .limit(5)
      .populate({ path: 'user', select: 'name' })
      .lean(),
    SubscriptionOrder.find({ status: 'paid' })
      .sort({ paidAt: -1 })
      .limit(5)
      .populate({ path: 'user', select: 'name' })
      .populate({ path: 'subscription', select: 'name' })
      .lean(),
    Enrollment.find()
      .sort({ enrolledAt: -1 })
      .limit(5)
      .populate({ path: 'user', select: 'name' })
      .populate({ path: 'course', select: 'title' })
      .lean()
  ])

  const courseActivities = recentCourseOrders.map(order => ({
    id: order._id,
    type: 'purchase',
    user: {
      id: order.user?._id || null,
      name: order.user?.name || 'Unknown User',
    },
    items: (order.items || []).map(item => ({
      itemId: item.itemId,
      itemType: item.itemType,
      title: item.title || 'Untitled Item'
    })),
    amount: order.grandTotal || order.totalAmount || 0,
    date: order.paidAt || order.createdAt
  }))

  const subscriptionActivities = recentSubscriptionOrders.map(order => ({
    id: order._id,
    type: 'subscription',
    user: {
      id: order.user?._id || null,
      name: order.user?.name || 'Unknown User',
    },
    items: [{
      itemId: order.subscription?._id || null,
      itemType: 'subscription',
      title: order.subscription?.name || 'Subscription Package'
    }],
    amount: order.amount || 0,
    date: order.paidAt || order.createdAt
  }))

  const enrollmentActivities = recentEnrollments.map(enrollment => ({
    id: enrollment._id,
    type: 'enrollment',
    user: {
      id: enrollment.user?._id || null,
      name: enrollment.user?.name || 'Unknown User',
    },
    items: [{
      itemId: enrollment.course?._id || null,
      itemType: 'course',
      title: enrollment.course?.title || 'Untitled Course'
    }],
    amount: 0,
    date: enrollment.enrolledAt || enrollment.createdAt
  }))

  const allActivities = [...courseActivities, ...subscriptionActivities, ...enrollmentActivities]
  allActivities.sort((a, b) => new Date(b.date) - new Date(a.date))
  
  return allActivities.slice(0, 5)
}

module.exports = {
  getDashboardStats,
  getEnrollmentStats,
  getRevenueStats,
  getUpcomingLiveClasses,
  getTopExamsByStudentCount,
  getCategorizedEnrollments,
  getDashboardCounts,
  getRecentActivities
}


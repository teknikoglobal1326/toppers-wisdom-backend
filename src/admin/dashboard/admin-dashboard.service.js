const mongoose = require('mongoose')
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
const SubExam = require('../../models/SubExam.model')
const { createLogger } = require('../../config/logger')

const logger = createLogger('admin:dashboard:service')

const parseDateRange = (query = {}) => {
  let startDate = null
  let endDate = null

  if (query.startDate && query.endDate) {
    const sStr = String(query.startDate).trim()
    const eStr = String(query.endDate).trim()

    if (/^\d{4}-\d{2}-\d{2}$/.test(sStr)) {
      startDate = new Date(`${sStr}T00:00:00.000+05:30`)
    } else {
      startDate = new Date(sStr)
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(eStr)) {
      endDate = new Date(`${eStr}T23:59:59.999+05:30`)
    } else {
      endDate = new Date(eStr)
    }

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      startDate = null
      endDate = null
    }
  }

  return { startDate, endDate }
}

const parseExamFilter = (query = {}) => {
  const examId = query.examId || query.exam
  if (examId && mongoose.Types.ObjectId.isValid(examId)) {
    return new mongoose.Types.ObjectId(examId)
  }
  return null
}

const getExamContextIds = async (examObjectId) => {
  if (!examObjectId) return null

  const [subExamIds, courseIds, testIds, subIds] = await Promise.all([
    SubExam.find({ examId: examObjectId, is_deleted: false }).distinct('_id'),
    Course.find({ exam: examObjectId, isDeleted: false }).distinct('_id'),
    TestSeries.find({ exam: examObjectId, isDeleted: false }).distinct('_id'),
    Subscription.find({
      $or: [{ examId: examObjectId }, { examIds: examObjectId }],
      isDeleted: false
    }).distinct('_id')
  ])

  return {
    examObjectId,
    subExamIds,
    courseIds,
    testIds,
    subIds,
    orderItemIds: [...courseIds, ...testIds]
  }
}

const getDashboardStats = async (query = {}) => {
  logger.info({ query }, 'Fetching admin dashboard stats')
  const { startDate, endDate } = parseDateRange(query)
  const examObjectId = parseExamFilter(query)
  const examContext = await getExamContextIds(examObjectId)

  const userMatch = { isDeleted: false }
  const courseMatch = { isDeleted: false }
  const testMatch = { isDeleted: false }
  const liveMatch = { isLive: true, isDeleted: false, status: 'active' }

  if (startDate && endDate) {
    userMatch.createdAt = { $gte: startDate, $lte: endDate }
    courseMatch.createdAt = { $gte: startDate, $lte: endDate }
    testMatch.createdAt = { $gte: startDate, $lte: endDate }
    liveMatch.scheduledStartTime = { $gte: startDate, $lte: endDate }
  } else {
    const startOfToday = new Date()
    startOfToday.setUTCHours(0, 0, 0, 0)
    const endOfToday = new Date()
    endOfToday.setUTCHours(23, 59, 59, 999)
    liveMatch.scheduledStartTime = { $gte: startOfToday, $lte: endOfToday }
  }

  if (examContext) {
    userMatch.$or = [
      { 'exam._id': examContext.examObjectId },
      { exam: examContext.examObjectId },
      { 'exam._id': examContext.examObjectId.toString() },
      ...(examContext.subExamIds.length > 0
        ? [
            { 'subExam._id': { $in: examContext.subExamIds } },
            { 'subExams._id': { $in: examContext.subExamIds } }
          ]
        : [])
    ]
    courseMatch.exam = examContext.examObjectId
    testMatch.exam = examContext.examObjectId
    liveMatch.course = { $in: examContext.courseIds }
  }

  const [totalUsers, totalCourses, totalTestSeries, todayLiveClasses] = await Promise.all([
    User.countDocuments(userMatch),
    Course.countDocuments(courseMatch),
    TestSeries.countDocuments(testMatch),
    Content.countDocuments(liveMatch)
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
  const { startDate: customStart, endDate: customEnd } = parseDateRange(query)
  const examObjectId = parseExamFilter(query)
  const examContext = await getExamContextIds(examObjectId)

  const courseObjectId = query.courseId && mongoose.Types.ObjectId.isValid(query.courseId)
    ? new mongoose.Types.ObjectId(query.courseId)
    : null

  let startDate, endDate, isCustomRange = false
  let year, month, half

  if (customStart && customEnd) {
    startDate = customStart
    endDate = customEnd
    isCustomRange = true
  } else {
    const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
    const defaultYear = nowIST.getFullYear()
    const defaultMonth = nowIST.getMonth() + 1 // 1-indexed
    const defaultHalf = nowIST.getDate() <= 15 ? 1 : 2

    year = Number(query.year) || defaultYear
    month = Number(query.month) || defaultMonth
    half = Number(query.half) || defaultHalf

    const startDay = half === 1 ? 1 : 16
    const endDay = half === 1 ? 15 : new Date(year, month, 0).getDate()

    const startIsoString = `${year}-${String(month).padStart(2, '0')}-${String(startDay).padStart(2, '0')}T00:00:00.000+05:30`
    const endIsoString = `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}T23:59:59.999+05:30`

    startDate = new Date(startIsoString)
    endDate = new Date(endIsoString)
  }

  const matchFilter = {
    enrolledAt: { $gte: startDate, $lte: endDate }
  }

  if (courseObjectId) {
    matchFilter.course = courseObjectId
  } else if (examContext) {
    matchFilter.course = { $in: examContext.courseIds }
  }

  const enrollments = await Enrollment.aggregate([
    {
      $match: matchFilter
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$enrolledAt', timezone: 'Asia/Kolkata' } },
        count: { $sum: 1 }
      }
    }
  ])

  const statsMap = new Map(enrollments.map(item => [item._id, item.count]))

  const dailyStats = []
  const currentCursor = new Date(startDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  const endCursor = new Date(endDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))

  while (currentCursor <= endCursor) {
    const y = currentCursor.getFullYear()
    const m = String(currentCursor.getMonth() + 1).padStart(2, '0')
    const d = String(currentCursor.getDate()).padStart(2, '0')
    const dateStr = `${y}-${m}-${d}`

    dailyStats.push({
      date: dateStr,
      day: currentCursor.getDate(),
      count: statsMap.get(dateStr) || 0
    })

    currentCursor.setDate(currentCursor.getDate() + 1)
  }

  return {
    year: year || startDate.getFullYear(),
    month: month || (startDate.getMonth() + 1),
    half: half || 1,
    isCustomRange,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    dailyStats
  }
}

const getRevenueStats = async (query = {}) => {
  logger.info({ query }, 'Fetching admin dashboard daily revenue stats')
  const { startDate: customStart, endDate: customEnd } = parseDateRange(query)
  const examObjectId = parseExamFilter(query)
  const examContext = await getExamContextIds(examObjectId)

  const courseObjectId = query.courseId && mongoose.Types.ObjectId.isValid(query.courseId)
    ? new mongoose.Types.ObjectId(query.courseId)
    : null
  const subObjectId = query.subscriptionId && mongoose.Types.ObjectId.isValid(query.subscriptionId)
    ? new mongoose.Types.ObjectId(query.subscriptionId)
    : null
  const revenueSource = query.source || query.revenueSource // 'all' | 'course' | 'subscription'

  let startDate, endDate, isCustomRange = false
  let year, month, half

  if (customStart && customEnd) {
    startDate = customStart
    endDate = customEnd
    isCustomRange = true
  } else {
    const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
    const defaultYear = nowIST.getFullYear()
    const defaultMonth = nowIST.getMonth() + 1 // 1-indexed
    const defaultHalf = nowIST.getDate() <= 15 ? 1 : 2

    year = Number(query.year) || defaultYear
    month = Number(query.month) || defaultMonth
    half = Number(query.half) || defaultHalf

    const startDay = half === 1 ? 1 : 16
    const endDay = half === 1 ? 15 : new Date(year, month, 0).getDate()

    const startIsoString = `${year}-${String(month).padStart(2, '0')}-${String(startDay).padStart(2, '0')}T00:00:00.000+05:30`
    const endIsoString = `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}T23:59:59.999+05:30`

    startDate = new Date(startIsoString)
    endDate = new Date(endIsoString)
  }

  let targetOrderItems = null
  if (courseObjectId) {
    targetOrderItems = [courseObjectId]
  } else if (examContext) {
    targetOrderItems = examContext.orderItemIds
  }

  let targetSubIds = null
  if (subObjectId) {
    targetSubIds = [subObjectId]
  } else if (examContext) {
    targetSubIds = examContext.subIds
  }

  const includeCourseOrders = revenueSource !== 'subscription' && !subObjectId
  const includeSubOrders = revenueSource !== 'course' && !courseObjectId

  const promises = []

  if (includeCourseOrders) {
    const courseOrderPipeline = [
      {
        $match: {
          status: 'paid',
          paidAt: { $gte: startDate, $lte: endDate },
          ...(targetOrderItems ? { 'items.itemId': { $in: targetOrderItems } } : {})
        }
      }
    ]

    if (targetOrderItems) {
      courseOrderPipeline.push(
        { $unwind: '$items' },
        { $match: { 'items.itemId': { $in: targetOrderItems } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt', timezone: 'Asia/Kolkata' } },
            count: { $sum: 1 },
            amount: { $sum: { $ifNull: ['$items.price', 0] } }
          }
        }
      )
    } else {
      courseOrderPipeline.push({
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt', timezone: 'Asia/Kolkata' } },
          count: { $sum: 1 },
          amount: { $sum: '$totalAmount' }
        }
      })
    }
    promises.push(CourseOrder.aggregate(courseOrderPipeline))
  } else {
    promises.push(Promise.resolve([]))
  }

  if (includeSubOrders) {
    const subOrderMatch = {
      status: 'paid',
      paidAt: { $gte: startDate, $lte: endDate },
      ...(targetSubIds ? { subscription: { $in: targetSubIds } } : {})
    }
    promises.push(SubscriptionOrder.aggregate([
      {
        $match: subOrderMatch
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt', timezone: 'Asia/Kolkata' } },
          count: { $sum: 1 },
          amount: { $sum: '$amount' }
        }
      }
    ]))
  } else {
    promises.push(Promise.resolve([]))
  }

  const [courseOrders, subscriptionOrders] = await Promise.all(promises)

  const courseMap = new Map(courseOrders.map(item => [item._id, { count: item.count, amount: item.amount }]))
  const subMap = new Map(subscriptionOrders.map(item => [item._id, { count: item.count, amount: item.amount }]))

  const dailyStats = []
  const currentCursor = new Date(startDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  const endCursor = new Date(endDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))

  while (currentCursor <= endCursor) {
    const y = currentCursor.getFullYear()
    const m = String(currentCursor.getMonth() + 1).padStart(2, '0')
    const d = String(currentCursor.getDate()).padStart(2, '0')
    const dateStr = `${y}-${m}-${d}`

    const courseInfo = courseMap.get(dateStr) || { count: 0, amount: 0 }
    const subInfo = subMap.get(dateStr) || { count: 0, amount: 0 }

    dailyStats.push({
      date: dateStr,
      day: currentCursor.getDate(),
      courseEnrollmentCount: courseInfo.count,
      courseEnrollmentRevenue: Number(courseInfo.amount.toFixed(2)),
      subscriptionCount: subInfo.count,
      subscriptionRevenue: Number(subInfo.amount.toFixed(2)),
      totalRevenue: Number((courseInfo.amount + subInfo.amount).toFixed(2))
    })

    currentCursor.setDate(currentCursor.getDate() + 1)
  }

  return {
    year: year || startDate.getFullYear(),
    month: month || (startDate.getMonth() + 1),
    half: half || 1,
    isCustomRange,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    dailyStats
  }
}

const getUpcomingLiveClasses = async (query = {}) => {
  logger.info({ query }, 'Fetching upcoming live classes for dashboard')
  const { startDate, endDate } = parseDateRange(query)
  const examObjectId = parseExamFilter(query)
  const examContext = await getExamContextIds(examObjectId)

  const courseObjectId = query.courseId && mongoose.Types.ObjectId.isValid(query.courseId)
    ? new mongoose.Types.ObjectId(query.courseId)
    : null

  require('../../models/Subject.model')
  const Enrollment = require('../../models/Enrollment.model')

  const matchFilter = {
    isLive: true,
    isDeleted: false,
    status: 'active'
  }

  if (startDate && endDate) {
    matchFilter.scheduledStartTime = { $gte: startDate, $lte: endDate }
  } else {
    const startOfToday = new Date()
    startOfToday.setUTCHours(0, 0, 0, 0)
    matchFilter.scheduledStartTime = { $gte: startOfToday }
  }

  if (courseObjectId) {
    matchFilter.course = courseObjectId
  } else if (examContext) {
    matchFilter.course = { $in: examContext.courseIds }
  }

  const liveClasses = await Content.find(matchFilter)
    .sort({ scheduledStartTime: 1 })
    .limit(20)
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

const getTopExamsByStudentCount = async (query = {}) => {
  logger.info({ query }, 'Fetching top 7 exams by student count')
  const { startDate, endDate } = parseDateRange(query)
  const examObjectId = parseExamFilter(query)

  const matchFilter = {
    isDeleted: false,
    'exam._id': { $ne: null }
  }

  if (startDate && endDate) {
    matchFilter.createdAt = { $gte: startDate, $lte: endDate }
  }

  if (examObjectId) {
    matchFilter.$or = [
      { 'exam._id': examObjectId },
      { 'exam._id': examObjectId.toString() }
    ]
  }

  const topExams = await User.aggregate([
    {
      $match: matchFilter
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

const getCategorizedEnrollments = async (query = {}) => {
  logger.info({ query }, 'Fetching paid enrollments categorized by Course, Test Series, and Subscription')
  const { startDate, endDate } = parseDateRange(query)
  const examObjectId = parseExamFilter(query)
  const examContext = await getExamContextIds(examObjectId)

  const courseMatch = { status: 'paid' }
  const subMatch = { status: 'paid' }

  if (startDate && endDate) {
    courseMatch.paidAt = { $gte: startDate, $lte: endDate }
    subMatch.paidAt = { $gte: startDate, $lte: endDate }
  }

  if (examContext) {
    courseMatch['items.itemId'] = { $in: examContext.orderItemIds }
    subMatch.subscription = { $in: examContext.subIds }
  }

  const [paidOrders, paidSubOrders] = await Promise.all([
    CourseOrder.find(courseMatch).lean(),
    SubscriptionOrder.find(subMatch).lean()
  ])

  const coursePurchaseCount = {}
  const testPurchaseCount = {}
  const subPurchaseCount = {}

  const validCourseIdSet = examContext ? new Set(examContext.courseIds.map(id => id.toString())) : null
  const validTestIdSet = examContext ? new Set(examContext.testIds.map(id => id.toString())) : null
  const validSubIdSet = examContext ? new Set(examContext.subIds.map(id => id.toString())) : null

  for (const order of paidOrders) {
    for (const item of order.items || []) {
      if (!item.itemId) continue
      const itemIdStr = item.itemId.toString()
      if (item.itemType === 'course') {
        if (!validCourseIdSet || validCourseIdSet.has(itemIdStr)) {
          coursePurchaseCount[itemIdStr] = (coursePurchaseCount[itemIdStr] || 0) + 1
        }
      } else if (item.itemType === 'test') {
        if (!validTestIdSet || validTestIdSet.has(itemIdStr)) {
          testPurchaseCount[itemIdStr] = (testPurchaseCount[itemIdStr] || 0) + 1
        }
      }
    }
  }

  for (const order of paidSubOrders) {
    if (!order.subscription) continue
    const subIdStr = order.subscription.toString()
    if (!validSubIdSet || validSubIdSet.has(subIdStr)) {
      subPurchaseCount[subIdStr] = (subPurchaseCount[subIdStr] || 0) + 1
    }
  }

  const courseIds = Object.keys(coursePurchaseCount)
  const testSeriesIds = Object.keys(testPurchaseCount)
  const subIds = Object.keys(subPurchaseCount)

  const [courses, testSeriesList, subscriptions] = await Promise.all([
    Course.find({ _id: { $in: courseIds } }).select('_id title').lean(),
    TestSeries.find({ _id: { $in: testSeriesIds } }).select('_id title').lean(),
    Subscription.find({ _id: { $in: subIds } }).select('_id name').lean()
  ])

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

  result.sort((a, b) => b.enrollmentCount - a.enrollmentCount)
  return result
}

const getDashboardCounts = async (query = {}) => {
  logger.info({ query }, 'Fetching admin dashboard total counts')
  const { startDate, endDate } = parseDateRange(query)
  const examObjectId = parseExamFilter(query)

  const matchFilter = { isDeleted: false }
  if (startDate && endDate) {
    matchFilter.createdAt = { $gte: startDate, $lte: endDate }
  }
  if (examObjectId) {
    matchFilter.exam = examObjectId
  }

  const [totalCourses, totalBooks, totalTestSeries, totalPreviousYearPapers, totalDailyQuizzes] = await Promise.all([
    Course.countDocuments(matchFilter),
    Book.countDocuments(matchFilter),
    TestSeries.countDocuments(matchFilter),
    PreviousYearPaper.countDocuments(matchFilter),
    DailyQuiz.countDocuments(matchFilter)
  ])

  return {
    totalCourses,
    totalBooks,
    totalTestSeries,
    totalPreviousYearPapers,
    totalDailyQuizzes
  }
}

const getRecentActivities = async (query = {}) => {
  logger.info({ query }, 'Fetching admin dashboard recent activity')
  const { startDate, endDate } = parseDateRange(query)
  const examObjectId = parseExamFilter(query)
  const examContext = await getExamContextIds(examObjectId)

  const courseMatch = { status: 'paid' }
  const subMatch = { status: 'paid' }
  const enrollMatch = {}

  if (startDate && endDate) {
    courseMatch.paidAt = { $gte: startDate, $lte: endDate }
    subMatch.paidAt = { $gte: startDate, $lte: endDate }
    enrollMatch.enrolledAt = { $gte: startDate, $lte: endDate }
  }

  if (examContext) {
    courseMatch['items.itemId'] = { $in: examContext.orderItemIds }
    subMatch.subscription = { $in: examContext.subIds }
    enrollMatch.course = { $in: examContext.courseIds }
  }

  const [recentCourseOrders, recentSubscriptionOrders, recentEnrollments] = await Promise.all([
    CourseOrder.find(courseMatch)
      .sort({ paidAt: -1 })
      .limit(10)
      .populate({ path: 'user', select: 'name' })
      .lean(),
    SubscriptionOrder.find(subMatch)
      .sort({ paidAt: -1 })
      .limit(10)
      .populate({ path: 'user', select: 'name' })
      .populate({ path: 'subscription', select: 'name' })
      .lean(),
    Enrollment.find(enrollMatch)
      .sort({ enrolledAt: -1 })
      .limit(10)
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
  
  return allActivities.slice(0, 20)
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

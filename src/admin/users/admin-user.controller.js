const catchAsync     = require('../../core/catchAsync')
const { sendSuccess, sendPaginated } = require('../../core/response')
const BaseService    = require('../../core/BaseService')
const userRepository = require('../../modules/user/user.repository')
const { paginate }   = require('../../core/paginate')
const CourseOrder          = require('../../models/CourseOrder.model')
const TestAttempt    = require('../../models/TestAttempt.model')

// Ensure Mongoose registers these models for dynamic populates in subscriptionInfo
require('../../models/TestSeries.model')
require('../../models/PreviousYearPaper.model')
require('../../models/LiveTestSeries.model')
require('../../models/Booster.model')
require('../../models/Vocabulary.model')
require('../../models/Editorial.model')

class AdminUserService extends BaseService {
  constructor() { super(userRepository, 'admin:user') }

  async getPaidUserIds() {
    const CourseOrder = require('../../models/CourseOrder.model')
    const SubscriptionOrder = require('../../models/SubscriptionOrder.model')
    const Enrollment = require('../../models/Enrollment.model')
    const UserSubscription = require('../../models/UserSubscription.model')

    const [coursePaidUsers, subPaidUsers, enrollmentUsers, activeSubUsers] = await Promise.all([
      CourseOrder.find({ status: 'paid' }).distinct('user'),
      SubscriptionOrder.find({ status: 'paid' }).distinct('user'),
      Enrollment.find().distinct('user'),
      UserSubscription.find({ isActive: true }).distinct('user')
    ])

    const paidUserSet = new Set([
      ...coursePaidUsers.map(u => u?.toString()).filter(Boolean),
      ...subPaidUsers.map(u => u?.toString()).filter(Boolean),
      ...enrollmentUsers.map(u => u?.toString()).filter(Boolean),
      ...activeSubUsers.map(u => u?.toString()).filter(Boolean)
    ])

    return Array.from(paidUserSet)
  }

  async getRemarkedUserIds() {
    const UserSubscription = require('../../models/UserSubscription.model')
    const Enrollment = require('../../models/Enrollment.model')
    const User = require('../../models/User.model')

    const [subUsers, enrollUsers, directRemarkUsers] = await Promise.all([
      UserSubscription.find({ remarks: { $exists: true, $nin: ['', null] } }).distinct('user'),
      Enrollment.find({ remarks: { $exists: true, $nin: ['', null] } }).distinct('user'),
      User.find({ remarks: { $exists: true, $nin: ['', null] } }).distinct('_id')
    ])

    const set = new Set([
      ...subUsers.map(u => u?.toString()).filter(Boolean),
      ...enrollUsers.map(u => u?.toString()).filter(Boolean),
      ...directRemarkUsers.map(u => u?.toString()).filter(Boolean)
    ])

    return Array.from(set)
  }

  async listAll(filters) {
    const filter = { role: 'user', isDeleted: { $ne: true } }
    if (filters.search) {
      filter.$or = [
        { name:  { $regex: filters.search, $options: 'i' } },
        { phone: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
      ]
    }
    if (filters.qualification && filters.qualification !== "") {
      filter['qualification._id'] = filters.qualification;
    }
    if (filters.examId && filters.examId !== "") {
      filter['exam._id'] = filters.examId;
    }
    if (filters.subExamId && filters.subExamId !== "") {
      filter['subExams._id'] = filters.subExamId;
    }
    if (filters.profileCompletionState && filters.profileCompletionState !== "") {
      filter.profileCompletionState = filters.profileCompletionState;
    }

    const paidUserIds = await this.getPaidUserIds()
    const paidUserIdSet = new Set(paidUserIds)

    let allowedIds = null
    let excludedIds = []

    if (filters.purchaseStatus === 'paid') {
      allowedIds = paidUserIds
    } else if (filters.purchaseStatus === 'unpaid') {
      excludedIds.push(...paidUserIds)
    }

    const hasRemarksVal = filters.hasRemarks || filters.hasRemark || filters.remarks || filters.isRemarked
    if (hasRemarksVal === 'true' || hasRemarksVal === true) {
      const remarkedUserIds = await this.getRemarkedUserIds()
      if (allowedIds) {
        const remarkSet = new Set(remarkedUserIds)
        allowedIds = allowedIds.filter(id => remarkSet.has(id.toString()))
      } else {
        allowedIds = remarkedUserIds
      }
    } else if (hasRemarksVal === 'false' || hasRemarksVal === false) {
      const remarkedUserIds = await this.getRemarkedUserIds()
      excludedIds.push(...remarkedUserIds)
    }

    if (allowedIds !== null) {
      filter._id = { $in: allowedIds }
    }
    if (excludedIds.length > 0) {
      if (filter._id && filter._id.$in) {
        const exclSet = new Set(excludedIds.map(x => x.toString()))
        filter._id.$in = filter._id.$in.filter(id => !exclSet.has(id.toString()))
      } else {
        filter._id = { $nin: excludedIds }
      }
    }

    const result = await this.getAll(filter, {
      page:   filters.page,
      limit:  filters.limit,
      sort:   { createdAt: -1 },
      select: 'name phone email isSocial qualification exam subExams profileCompletionState profileComplete createdAt status remarks allocatedByName allocatedBy',
    })

    const userIds = (result.data || []).map(u => (u._id || u.id)?.toString()).filter(Boolean)
    const UserSubscription = require('../../models/UserSubscription.model')
    const Enrollment = require('../../models/Enrollment.model')

    const [subRemarks, enrollRemarks] = await Promise.all([
      UserSubscription.find({ user: { $in: userIds }, remarks: { $exists: true, $nin: ['', null] } }).sort({ createdAt: -1 }).lean(),
      Enrollment.find({ user: { $in: userIds }, remarks: { $exists: true, $nin: ['', null] } }).sort({ enrolledAt: -1 }).lean()
    ])

    const remarkMap = {}
    const assignerMap = {}
    subRemarks.forEach(s => {
      const uid = s.user?.toString()
      if (uid && !remarkMap[uid]) {
        remarkMap[uid] = s.remarks
        assignerMap[uid] = s.allocatedByName || 'Admin'
      }
    })
    enrollRemarks.forEach(e => {
      const uid = e.user?.toString()
      if (uid && !remarkMap[uid]) {
        remarkMap[uid] = e.remarks
        assignerMap[uid] = e.allocatedByName || 'Admin'
      }
    })

    const transformedData = (result.data || []).map(u => {
      const uObj = u.toObject ? u.toObject() : { ...u }
      const uid = String(uObj._id)
      uObj.isPaid = paidUserIdSet.has(uid)
      uObj.remarks = uObj.remarks || remarkMap[uid] || ''
      uObj.allocatedByName = uObj.allocatedByName || assignerMap[uid] || ''
      return uObj
    })

    return {
      data: transformedData,
      pagination: result.pagination
    }
  }

  async exportUsers(filters = {}) {
    const filter = { role: 'user', isDeleted: { $ne: true } }
    if (filters.search) {
      filter.$or = [
        { name:  { $regex: filters.search, $options: 'i' } },
        { phone: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
      ]
    }
    if (filters.qualification && filters.qualification !== "") {
      filter['qualification._id'] = filters.qualification;
    }
    if (filters.examId && filters.examId !== "") {
      filter['exam._id'] = filters.examId;
    }
    if (filters.subExamId && filters.subExamId !== "") {
      filter['subExams._id'] = filters.subExamId;
    }
    if (filters.profileCompletionState && filters.profileCompletionState !== "") {
      filter.profileCompletionState = filters.profileCompletionState;
    }

    const paidUserIds = await this.getPaidUserIds()
    const paidUserIdSet = new Set(paidUserIds)

    let allowedIds = null
    let excludedIds = []

    if (filters.purchaseStatus === 'paid') {
      allowedIds = paidUserIds
    } else if (filters.purchaseStatus === 'unpaid') {
      excludedIds.push(...paidUserIds)
    }

    const hasRemarksVal = filters.hasRemarks || filters.hasRemark || filters.remarks || filters.isRemarked
    if (hasRemarksVal === 'true' || hasRemarksVal === true) {
      const remarkedUserIds = await this.getRemarkedUserIds()
      if (allowedIds) {
        const remarkSet = new Set(remarkedUserIds)
        allowedIds = allowedIds.filter(id => remarkSet.has(id.toString()))
      } else {
        allowedIds = remarkedUserIds
      }
    } else if (hasRemarksVal === 'false' || hasRemarksVal === false) {
      const remarkedUserIds = await this.getRemarkedUserIds()
      excludedIds.push(...remarkedUserIds)
    }

    if (allowedIds !== null) {
      filter._id = { $in: allowedIds }
    }
    if (excludedIds.length > 0) {
      if (filter._id && filter._id.$in) {
        const exclSet = new Set(excludedIds.map(x => x.toString()))
        filter._id.$in = filter._id.$in.filter(id => !exclSet.has(id.toString()))
      } else {
        filter._id = { $nin: excludedIds }
      }
    }

    const User = require('../../models/User.model')
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .select('name phone email isSocial qualification exam subExams profileCompletionState profileComplete createdAt status remarks allocatedByName')
      .lean()

    const userIds = users.map(u => u._id?.toString()).filter(Boolean)
    const UserSubscription = require('../../models/UserSubscription.model')
    const Enrollment = require('../../models/Enrollment.model')

    const [subRemarks, enrollRemarks] = await Promise.all([
      UserSubscription.find({ user: { $in: userIds }, remarks: { $exists: true, $nin: ['', null] } }).sort({ createdAt: -1 }).lean(),
      Enrollment.find({ user: { $in: userIds }, remarks: { $exists: true, $nin: ['', null] } }).sort({ enrolledAt: -1 }).lean()
    ])

    const remarkMap = {}
    const assignerMap = {}
    subRemarks.forEach(s => {
      const uid = s.user?.toString()
      if (uid && !remarkMap[uid]) {
        remarkMap[uid] = s.remarks
        assignerMap[uid] = s.allocatedByName || 'Admin'
      }
    })
    enrollRemarks.forEach(e => {
      const uid = e.user?.toString()
      if (uid && !remarkMap[uid]) {
        remarkMap[uid] = e.remarks
        assignerMap[uid] = e.allocatedByName || 'Admin'
      }
    })

    const formatProfileStatus = (status) => {
      if (!status) return 'Incomplete'
      const map = {
        profileFull: 'Profile Completed',
        profileComplete: 'Profile Completed',
        profileCompleted: 'Profile Completed',
        onboarding: 'Onboarding',
        otpsent: 'OTP Sent',
        otpPending: 'OTP Pending',
        password_created: 'Password Created',
        profileIncomplete: 'Profile Incomplete',
        verifyOtp: 'Verify OTP'
      }
      return map[status] || String(status).replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
    }

    const formatExportDate = (date) => {
      if (!date) return 'N/A'
      const d = new Date(date)
      if (isNaN(d.getTime())) return 'N/A'
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const day = String(d.getDate()).padStart(2, '0')
      const month = months[d.getMonth()]
      const year = d.getFullYear()
      return `${day}-${month}-${year}`
    }

    const formatAccountStatus = (status) => {
      if (!status) return 'Active'
      return String(status).charAt(0).toUpperCase() + String(status).slice(1)
    }

    return users.map((u, index) => {
      const isPaid = paidUserIdSet.has(String(u._id))
      const subExamsNames = Array.isArray(u.subExams) ? u.subExams.map(s => s.name || s).join(', ') : ''
      const userRemarks = u.remarks || remarkMap[String(u._id)] || ''
      const userAssigner = u.allocatedByName || assignerMap[String(u._id)] || 'N/A'
      return {
        serialNo: index + 1,
        name: u.name || 'N/A',
        phone: u.phone || 'N/A',
        email: u.email || 'N/A',
        qualification: u.qualification?.name || 'N/A',
        exam: u.exam?.name || 'N/A',
        subExams: subExamsNames || 'N/A',
        profileStatus: formatProfileStatus(u.profileCompletionState),
        purchaseStatus: isPaid ? 'Paid' : 'Unpaid',
        remarks: userRemarks || 'N/A',
        allocatedBy: userAssigner,
        accountStatus: formatAccountStatus(u.status),
        loginType: u.isSocial ? 'Google Login' : 'Normal Login',
        joinedAt: formatExportDate(u.createdAt)
      }
    })
  }

  async getDetails(userId) {
    const user = await this.getById(userId)
    if (user) {
      delete user.password
      delete user.plainPassword
    }

    const UserSubscription = require('../../models/UserSubscription.model')
    const Enrollment = require('../../models/Enrollment.model')
    const AiTestAttempt = require('../../models/AiTestAttempt.model')
    const LiveTestAttempt = require('../../models/LiveTestAttempt.model')
    const PreviousYearPaperAttempt = require('../../models/PreviousYearPaperAttempt.model')
    const DailyQuizAttempt = require('../../models/DailyQuizAttempt.model')
    const TestSeriesAttempt = require('../../models/TestSeriesAttempt.model')
    const CourseTestAttempt = require('../../models/CourseTestAttempt.model')

    const [
      subscriptionInfo,
      coursePurchasedCount,
      aiAttemptsCount,
      liveAttemptsCount,
      pypAttemptsCount,
      quizAttemptsCount,
      testSeriesAttemptsCount,
      courseAttemptsCount,
      generalAttemptsCount
    ] = await Promise.all([
      UserSubscription.findOne({ user: userId })
        .sort({ createdAt: -1 })
        .populate({
          path: 'subscription',
          populate: [
            { path: 'examId', select: 'name phone email isSocial qualification exam subExams profileCompletionState profileComplete createdAt status' },
            { path: 'examIds', select: 'name phone email isSocial qualification exam subExams profileCompletionState profileComplete createdAt status' },
            { path: 'tests.moduleId', select: 'name phone email isSocial qualification exam subExams profileCompletionState profileComplete createdAt status' },
            { path: 'boosters.moduleId', select: 'name phone email isSocial qualification exam subExams profileCompletionState profileComplete createdAt status' }
          ]
        })
        .populate('allocatedBy', 'name email role')
        .lean(),
      Enrollment.countDocuments({ user: userId }),
      AiTestAttempt.countDocuments({ user: userId }),
      LiveTestAttempt.countDocuments({ user: userId }),
      PreviousYearPaperAttempt.countDocuments({ user: userId }),
      DailyQuizAttempt.countDocuments({ user: userId }),
      TestSeriesAttempt.countDocuments({ user: userId }),
      CourseTestAttempt.countDocuments({ user: userId }),
      TestAttempt.countDocuments({ user: userId })
    ])

    const coursePurchasedInfo = {
      count: coursePurchasedCount
    }

    const testAttemptInfo = {
      AiTest: { count: aiAttemptsCount },
      LiveTest: { count: liveAttemptsCount },
      PreviousYearPaperTest: { count: pypAttemptsCount },
      DailyQuizTest: { count: quizAttemptsCount },
      TestSeriesTest: { count: testSeriesAttemptsCount },
      CourseTest: { count: courseAttemptsCount },
      general: { count: generalAttemptsCount }
    }

    return {
      userResponse: user,
      subscriptionInfo,
      coursePurchasedInfo,
      testAttemptInfo
    }
  }
}

const svc = new AdminUserService()

const listAll     = catchAsync(async (req, res) => { const r = await svc.listAll(req.query); sendPaginated(res, r.data, r.pagination) })
const getOne      = catchAsync(async (req, res) => { sendSuccess(res, await svc.getDetails(req.params.id)) })
const updateUser  = catchAsync(async (req, res) => { sendSuccess(res, await svc.update(req.params.id, req.body)) })

const getUserOrders = catchAsync(async (req, res) => {
  const r = await paginate(CourseOrder, { user: req.params.id }, { page: req.query.page, limit: req.query.limit })
  sendPaginated(res, r.data, r.pagination)
})

const getUserEnrollments = catchAsync(async (req, res) => {
  const Enrollment = require('../../models/Enrollment.model')
  const { page, limit } = req.query
  const r = await paginate(Enrollment, { user: req.params.id }, {
    page,
    limit,
    populate: 'course',
    sort: { enrolledAt: -1 }
  })

  const mappedData = r.data.map(e => ({
    courseId: e.course?._id || null,
    title: e.course?.title || '',
    thumbnail: e.course?.thumbnail || '',
    type: e.course?.type || '',
    price: e.course?.price || 0,
    validityInMonths: e.course?.validityInMonths,
    isLifetime: e.course?.isLifetime,
    enrolledAt: e.enrolledAt,
    expiresAt: e.expiresAt,
    progressPercent: e.progressPercent,
    progress: e.progress,
    remarks: e.remarks || '',
    allocatedByName: e.allocatedByName || (e.allocatedBy ? 'Admin' : '')
  }))

  sendPaginated(res, mappedData, r.pagination)
})

const getUserAttempts = catchAsync(async (req, res) => {
  const { type, page, limit } = req.query
  const userId = req.params.id

  let model
  let populateOpt

  switch (type) {
    case 'AiTest':
      model = require('../../models/AiTestAttempt.model')
      populateOpt = { path: 'aiTest' }
      break
    case 'LiveTest':
      model = require('../../models/LiveTestAttempt.model')
      populateOpt = {
        path: 'liveTest',
        populate: [
          { path: 'examId', select: 'name phone email isSocial qualification exam subExams profileCompletionState profileComplete createdAt status' },
          { path: 'subExamIds', select: 'name phone email isSocial qualification exam subExams profileCompletionState profileComplete createdAt status' }
        ]
      }
      break
    case 'PreviousYearPaperTest':
      model = require('../../models/PreviousYearPaperAttempt.model')
      populateOpt = [
        {
          path: 'previousYearPaper',
          populate: [
            { path: 'exam', select: 'name phone email isSocial qualification exam subExams profileCompletionState profileComplete createdAt status' },
            { path: 'subExams', select: 'name phone email isSocial qualification exam subExams profileCompletionState profileComplete createdAt status' }
          ]
        },
        { path: 'test' }
      ]
      break
    case 'DailyQuizTest':
      model = require('../../models/DailyQuizAttempt.model')
      populateOpt = {
        path: 'quiz',
        populate: [
          { path: 'exam', select: 'name phone email isSocial qualification exam subExams profileCompletionState profileComplete createdAt status' },
          { path: 'subExams', select: 'name phone email isSocial qualification exam subExams profileCompletionState profileComplete createdAt status' }
        ]
      }
      break
    case 'TestSeriesTest':
      model = require('../../models/TestSeriesAttempt.model')
      populateOpt = [
        {
          path: 'testSeries',
          populate: [
            { path: 'exam', select: 'name phone email isSocial qualification exam subExams profileCompletionState profileComplete createdAt status' },
            { path: 'subExams', select: 'name phone email isSocial qualification exam subExams profileCompletionState profileComplete createdAt status' }
          ]
        },
        { path: 'test' }
      ]
      break
    case 'CourseTest':
      model = require('../../models/CourseTestAttempt.model')
      populateOpt = [
        { path: 'course' },
        { path: 'courseTest' }
      ]
      break
    case 'general':
    default:
      model = require('../../models/TestAttempt.model')
      populateOpt = {
        path: 'test',
        populate: [
          { path: 'subExam', select: 'name phone email isSocial qualification exam subExams profileCompletionState profileComplete createdAt status' }
        ]
      }
      break
  }

  const r = await paginate(model, { user: userId }, {
    page,
    limit,
    populate: populateOpt,
    sort: { attemptedAt: -1 }
  })

  const Subject = require('../../models/Subject.model')
  const subjectsList = await Subject.find({ isDeleted: { $ne: true } }).lean()

  const formattedData = r.data.map(attempt => {
    let testKey
    switch (type) {
      case 'AiTest':
        testKey = 'aiTest'
        break
      case 'LiveTest':
        testKey = 'liveTest'
        break
      case 'PreviousYearPaperTest':
        testKey = 'test'
        break
      case 'DailyQuizTest':
        testKey = 'quiz'
        break
      case 'TestSeriesTest':
        testKey = 'test'
        break
      case 'CourseTest':
        testKey = 'courseTest'
        break
      case 'general':
      default:
        testKey = 'test'
        break
    }

    const testDoc = attempt[testKey]
    if (!testDoc) return attempt

    const minimalTest = {
      _id: testDoc._id,
      title: testDoc.title || testDoc.name || ''
    }

    // Resolve exam
    if (testDoc.exam) {
      minimalTest.exam = testDoc.exam
    } else if (testDoc.examId) {
      minimalTest.exam = testDoc.examId
    } else if (attempt.previousYearPaper && attempt.previousYearPaper.exam) {
      minimalTest.exam = attempt.previousYearPaper.exam
    } else if (attempt.testSeries && attempt.testSeries.exam) {
      minimalTest.exam = attempt.testSeries.exam
    }

    // Resolve subExam
    if (testDoc.subExam) {
      minimalTest.subExam = testDoc.subExam
    } else if (testDoc.subExams) {
      minimalTest.subExams = testDoc.subExams
    } else if (testDoc.subExamIds) {
      minimalTest.subExams = testDoc.subExamIds
    } else if (attempt.previousYearPaper && attempt.previousYearPaper.subExams) {
      minimalTest.subExams = attempt.previousYearPaper.subExams
    } else if (attempt.testSeries && attempt.testSeries.subExams) {
      minimalTest.subExams = attempt.testSeries.subExams
    }

    // Resolve syllabus mapping (subjects, chapters, topics)
    const subjectIds = testDoc.subjectIds || testDoc.subjects || []
    const chapterIds = testDoc.chapterIds || testDoc.chapters || []
    const topicIds = testDoc.topicIds || testDoc.topics || []

    const resolvedSubjects = []
    const resolvedChapters = []
    const resolvedTopics = []

    for (const subId of subjectIds) {
      const subIdStr = subId._id ? subId._id.toString() : subId.toString()
      const subject = subjectsList.find(s => s._id.toString() === subIdStr)
      if (subject) {
        resolvedSubjects.push({ _id: subject._id, name: subject.name })

        if (subject.chapters) {
          for (const chapter of subject.chapters) {
            if (chapterIds.some(cid => cid.toString() === chapter._id.toString())) {
              resolvedChapters.push({ _id: chapter._id, name: chapter.name })
            }
            if (chapter.topics) {
              for (const topic of chapter.topics) {
                if (topicIds.some(tid => tid.toString() === topic._id.toString())) {
                  resolvedTopics.push({ _id: topic._id, name: topic.name })
                }
              }
            }
          }
        }
      }
    }

    minimalTest.subjects = resolvedSubjects
    minimalTest.chapters = resolvedChapters
    minimalTest.topics = resolvedTopics

    attempt[testKey] = minimalTest

    // Remove verbose dynamic reference caches
    delete attempt.previousYearPaper
    delete attempt.testSeries

    return attempt
  })

  sendPaginated(res, formattedData, r.pagination)
})


const allocateSubscription = catchAsync(async (req, res) => {
  const userId = req.params.id
  const { subscriptionId, durationDays, startDate, endDate, remarks, allocatedByName } = req.body

  const Subscription = require('../../models/Subscription.model')
  const UserSubscription = require('../../models/UserSubscription.model')
  const User = require('../../models/User.model')

  const sub = await Subscription.findById(subscriptionId)
  if (!sub) {
    return res.status(404).json({ success: false, message: 'Subscription plan not found' })
  }

  const start = startDate ? new Date(startDate) : new Date()
  let end = endDate ? new Date(endDate) : null
  if (!end) {
    const days = durationDays || sub.durationDays || 30
    end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000)
  }

  // Deactivate any previous active subscription for this user
  await UserSubscription.updateMany({ user: userId, isActive: true }, { isActive: false })

  const assignerId = req.admin?._id || req.member?._id || req.user?._id || null
  const assignerName = allocatedByName || req.admin?.name || req.member?.name || (req.admin?.email ? req.admin.email.split('@')[0] : 'Admin')

  const userSub = await UserSubscription.create({
    user: userId,
    subscription: subscriptionId,
    startDate: start,
    endDate: end,
    isActive: true,
    remarks: remarks || '',
    allocatedBy: assignerId,
    allocatedByName: assignerName
  })

  if (remarks || assignerName) {
    await User.findByIdAndUpdate(userId, { 
      remarks: remarks || undefined, 
      allocatedBy: assignerId,
      allocatedByName: assignerName
    })
  }

  sendSuccess(res, userSub, 'Subscription allocated successfully')
})

const updateSubscriptionExpiry = catchAsync(async (req, res) => {
  const userId = req.params.id
  const { userSubscriptionId, daysToAdd, newEndDate, isActive } = req.body
  const UserSubscription = require('../../models/UserSubscription.model')

  let activeSub = null
  if (userSubscriptionId) {
    activeSub = await UserSubscription.findOne({ _id: userSubscriptionId, user: userId })
  }
  if (!activeSub) {
    activeSub = await UserSubscription.findOne({ user: userId }).sort({ createdAt: -1 })
  }
  if (!activeSub) {
    return res.status(404).json({ success: false, message: 'No subscription record found for this user' })
  }

  if (daysToAdd !== undefined && daysToAdd !== null) {
    const currentEnd = activeSub.endDate ? new Date(activeSub.endDate).getTime() : Date.now()
    activeSub.endDate = new Date(currentEnd + Number(daysToAdd) * 24 * 60 * 60 * 1000)
  } else if (newEndDate) {
    activeSub.endDate = new Date(newEndDate)
  }

  if (isActive !== undefined) {
    activeSub.isActive = isActive
  }

  await activeSub.save()
  sendSuccess(res, activeSub, 'Subscription expiry updated successfully')
})

const revokeSubscription = catchAsync(async (req, res) => {
  const userId = req.params.id
  const { userSubscriptionId } = req.body || {}
  const UserSubscription = require('../../models/UserSubscription.model')

  if (userSubscriptionId) {
    await UserSubscription.findByIdAndUpdate(userSubscriptionId, { isActive: false })
  } else {
    await UserSubscription.updateMany({ user: userId }, { isActive: false })
  }
  sendSuccess(res, null, 'Subscription revoked successfully')
})

const allocateCourse = catchAsync(async (req, res) => {
  const userId = req.params.id
  const { courseId, durationDays, startDate, expiresAt, remarks, allocatedByName } = req.body

  const Course = require('../../models/Course.model')
  const Enrollment = require('../../models/Enrollment.model')
  const User = require('../../models/User.model')

  const course = await Course.findById(courseId)
  if (!course) {
    return res.status(404).json({ success: false, message: 'Course not found' })
  }

  const enrolledAt = startDate ? new Date(startDate) : new Date()
  let expiry = expiresAt ? new Date(expiresAt) : null
  if (!expiry && durationDays) {
    expiry = new Date(enrolledAt.getTime() + Number(durationDays) * 24 * 60 * 60 * 1000)
  } else if (!expiry && !course.isLifetime) {
    const months = course.validityInMonths || 12
    expiry = new Date(enrolledAt.getTime() + months * 30 * 24 * 60 * 60 * 1000)
  }

  const assignerId = req.admin?._id || req.member?._id || req.user?._id || null
  const assignerName = allocatedByName || req.admin?.name || req.member?.name || (req.admin?.email ? req.admin.email.split('@')[0] : 'Admin')

  const enrollment = await Enrollment.findOneAndUpdate(
    { user: userId, course: courseId },
    {
      enrolledAt,
      expiresAt: expiry,
      progressPercent: 0,
      remarks: remarks || '',
      allocatedBy: assignerId,
      allocatedByName: assignerName
    },
    { upsert: true, new: true }
  )

  if (remarks || assignerName) {
    await User.findByIdAndUpdate(userId, { 
      remarks: remarks || undefined, 
      allocatedBy: assignerId,
      allocatedByName: assignerName
    })
  }

  sendSuccess(res, enrollment, 'Course allocated successfully to user')
})

const updateCourseExpiry = catchAsync(async (req, res) => {
  const { id: userId, courseId } = req.params
  const { daysToAdd, newExpiresAt } = req.body
  const Enrollment = require('../../models/Enrollment.model')

  const enrollment = await Enrollment.findOne({ user: userId, course: courseId })
  if (!enrollment) {
    return res.status(404).json({ success: false, message: 'Enrollment not found' })
  }

  if (daysToAdd !== undefined && daysToAdd !== null) {
    const currentEnd = enrollment.expiresAt ? new Date(enrollment.expiresAt).getTime() : Date.now()
    enrollment.expiresAt = new Date(currentEnd + Number(daysToAdd) * 24 * 60 * 60 * 1000)
  } else if (newExpiresAt) {
    enrollment.expiresAt = new Date(newExpiresAt)
  }

  await enrollment.save()
  sendSuccess(res, enrollment, 'Course expiry updated successfully')
})

const removeCourseEnrollment = catchAsync(async (req, res) => {
  const { id: userId, courseId } = req.params
  const Enrollment = require('../../models/Enrollment.model')

  await Enrollment.findOneAndDelete({ user: userId, course: courseId })
  sendSuccess(res, null, 'Course enrollment removed successfully')
})

const exportUsers = catchAsync(async (req, res) => {
  const users = await svc.exportUsers(req.query)

  if (req.query.format === 'json') {
    return sendSuccess(res, users, 'Export data retrieved successfully')
  }

  const headers = ['S.No', 'Name', 'Phone', 'Email', 'Qualification', 'Exam', 'Sub Exams', 'Profile Status', 'Plan Status', 'Remarks', 'Allocated By', 'Account Status', 'Login Type', 'Joined On']
  const csvRows = [headers.join(',')]

  for (const u of users) {
    const phoneVal = u.phone && u.phone !== 'N/A' ? '="' + String(u.phone).replace(/"/g, '""') + '"' : '"N/A"'
    const dateVal = u.joinedAt && u.joinedAt !== 'N/A' ? '="' + String(u.joinedAt).replace(/"/g, '""') + '"' : '"N/A"'

    const row = [
      u.serialNo,
      `"${String(u.name || '').replace(/"/g, '""')}"`,
      phoneVal,
      `"${String(u.email || '').replace(/"/g, '""')}"`,
      `"${String(u.qualification || '').replace(/"/g, '""')}"`,
      `"${String(u.exam || '').replace(/"/g, '""')}"`,
      `"${String(u.subExams || '').replace(/"/g, '""')}"`,
      `"${String(u.profileStatus || '').replace(/"/g, '""')}"`,
      `"${String(u.purchaseStatus || '').replace(/"/g, '""')}"`,
      `"${String(u.remarks || '').replace(/"/g, '""')}"`,
      `"${String(u.allocatedBy || '').replace(/"/g, '""')}"`,
      `"${String(u.accountStatus || '').replace(/"/g, '""')}"`,
      `"${String(u.loginType || '').replace(/"/g, '""')}"`,
      dateVal
    ]
    csvRows.push(row.join(','))
  }

  const csvString = "\uFEFF" + csvRows.join("\r\n")
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="users_export_${new Date().toISOString().slice(0, 10)}.csv"`)
  res.status(200).send(csvString)
})

module.exports = {
  listAll,
  getOne,
  updateUser,
  getUserOrders,
  getUserEnrollments,
  getUserAttempts,
  allocateSubscription,
  updateSubscriptionExpiry,
  revokeSubscription,
  allocateCourse,
  updateCourseExpiry,
  removeCourseEnrollment,
  exportUsers
}


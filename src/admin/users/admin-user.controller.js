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

  async listAll(filters) {
    const filter = { role: 'user', isDeleted: { $ne: true } }
    if (filters.search) {
      filter.$or = [
        { name:  { $regex: filters.search, $options: 'i' } },
        { phone: { $regex: filters.search, $options: 'i' } },
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

    return this.getAll(filter, {
      page:   filters.page,
      limit:  filters.limit,
      select: 'name phone email isSocial qualification exam subExams profileCompletionState profileComplete createdAt status',
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
    progress: e.progress
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

module.exports = { listAll, getOne, updateUser, getUserOrders, getUserAttempts, getUserEnrollments }

const User       = require('../../models/User.model')
const Enrollment = require('../../models/Enrollment.model')
const TestSeriesAttempt = require('../../models/TestSeriesAttempt.model')
const Course = require('../../models/Course.model')
const TestSeries = require('../../models/TestSeries.model')
const CourseOrder      = require('../../models/CourseOrder.model')
const Test       = require('../../models/Test.model')
const { createLogger } = require('../../config/logger')
const AppError = require('../../core/AppError')

const logger = createLogger('admin:analytics:service')

const buildSearchMatch = (search, fields) => {
  const value = (search || '').trim()
  if (!value) return null

  return {
    $or: fields.map((field) => ({ [field]: { $regex: value, $options: 'i' } })),
  }
}

const buildPagination = (page = 1, limit = 20) => {
  const safePage = Math.max(1, parseInt(page, 10) || 1)
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20))
  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  }
}

const buildPaginatedResult = (data, total, page, limit, summary, meta = {}) => ({
  data,
  summary,
  meta,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page < Math.ceil(total / limit),
    hasPrevPage: page > 1,
  },
})

const overview = async () => {
  logger.info('Fetching analytics overview')
  const [totalUsers, totalEnrollments, revenueResult, activeTests] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    Enrollment.countDocuments(),
    CourseOrder.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
    Test.countDocuments({ status: 'published' }),
  ])
  return { totalUsers, totalEnrollments, totalRevenue: revenueResult[0]?.total || 0, activeTests }
}

const revenue = async (from, to) => {
  logger.info({ from, to }, 'Fetching revenue report')
  return CourseOrder.aggregate([
    { $match: { status: 'paid', paidAt: { $gte: new Date(from), $lte: new Date(to) } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } }, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ])
}

const users = async (from, to) => {
  logger.info({ from, to }, 'Fetching user growth report')
  return User.aggregate([
    { $match: { role: 'user', createdAt: { $gte: new Date(from), $lte: new Date(to) } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ])
}

const courseEnrollments = async (courseId, filters = {}) => {
  const course = await Course.findOne({ _id: courseId, isDeleted: false })
    .select('_id title slug thumbnail status type')
    .lean()

  if (!course) throw new AppError('Course not found', 404)

  const { page, limit, skip } = buildPagination(filters.page, filters.limit)
  const searchMatch = buildSearchMatch(filters.search, ['user.name', 'user.email', 'user.phone'])

  logger.info({ page, limit, search: filters.search, courseId }, 'Fetching course enrollments analytics')

  const pipeline = [
    { $match: { course: course._id } },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    { $match: { 'user.role': 'user', 'user.isDeleted': { $ne: true } } },
  ]

  if (searchMatch) pipeline.push({ $match: searchMatch })

  pipeline.push(
    {
      $lookup: {
        from: 'courses',
        localField: 'course',
        foreignField: '_id',
        as: 'course',
      },
    },
    {
      $unwind: {
        path: '$course',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $facet: {
        data: [
          { $sort: { enrolledAt: -1, createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              enrolledAt: 1,
              completedAt: 1,
              expiresAt: 1,
              progressPercent: 1,
              progress: 1,
              createdAt: 1,
              updatedAt: 1,
              user: {
                _id: '$user._id',
                name: '$user.name',
                email: '$user.email',
                phone: '$user.phone',
                avatar: '$user.avatar',
              },
              course: {
                _id: course._id,
                title: course.title,
                slug: course.slug,
                thumbnail: course.thumbnail,
                status: course.status,
                type: course.type,
              },
            },
          },
        ],
        summary: [
          {
            $group: {
              _id: null,
              totalEnrollments: { $sum: 1 },
              activeEnrollments: {
                $sum: {
                  $cond: [{ $gt: [{ $ifNull: ['$progressPercent', 0] }, 0] }, 1, 0],
                },
              },
              inactiveEnrollments: {
                $sum: {
                  $cond: [{ $lte: [{ $ifNull: ['$progressPercent', 0] }, 0] }, 1, 0],
                },
              },
              totalUsers: { $addToSet: '$user._id' },
            },
          },
          {
            $project: {
              _id: 0,
              totalEnrollments: 1,
              activeEnrollments: 1,
              inactiveEnrollments: 1,
              totalUsers: { $size: '$totalUsers' },
            },
          },
        ],
      },
    }
  )

  const [result] = await Enrollment.aggregate(pipeline)
  const summary = result?.summary?.[0] || {
    totalEnrollments: 0,
    activeEnrollments: 0,
    inactiveEnrollments: 0,
    totalUsers: 0,
  }

  const total = summary.totalEnrollments
  return buildPaginatedResult(result?.data || [], total, page, limit, {
    ...summary,
    course,
  })
}

const testSeriesAttempts = async (testSeriesId, filters = {}) => {
  const testSeries = await TestSeries.findOne({ _id: testSeriesId, isDeleted: false })
    .select('_id title thumbnail status isPaid')
    .lean()

  if (!testSeries) throw new AppError('Test series not found', 404)

  const { page, limit, skip } = buildPagination(filters.page, filters.limit)
  const searchMatch = buildSearchMatch(filters.search, ['user.name', 'user.email', 'user.phone'])

  logger.info({ page, limit, search: filters.search, testSeriesId }, 'Fetching test-series attempts analytics')

  const pipeline = [
    { $match: { testSeries: testSeries._id } },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    { $match: { 'user.role': 'user', 'user.isDeleted': { $ne: true } } },
  ]

  if (searchMatch) pipeline.push({ $match: searchMatch })

  pipeline.push(
    {
      $lookup: {
        from: 'testseries',
        localField: 'testSeries',
        foreignField: '_id',
        as: 'testSeries',
      },
    },
    {
      $unwind: {
        path: '$testSeries',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'testseriestests',
        localField: 'test',
        foreignField: '_id',
        as: 'test',
      },
    },
    {
      $unwind: {
        path: '$test',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $facet: {
        data: [
          { $sort: { attemptedAt: -1, createdAt: -1 } },
          {
            $group: {
              _id: '$user._id',
              doc: { $first: '$$ROOT' },
              userAttemptsCount: { $sum: 1 },
            },
          },
          {
            $replaceRoot: {
              newRoot: { $mergeObjects: ['$doc', { userAttemptsCount: '$userAttemptsCount' }] },
            },
          },
          { $sort: { attemptedAt: -1, createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              sessionId: 1,
              status: 1,
              score: 1,
              totalMarks: 1,
              accuracy: 1,
              timeTaken: 1,
              totalTime: 1,
              correct: 1,
              wrong: 1,
              skipped: 1,
              unattempted: 1,
              attemptedAt: 1,
              createdAt: 1,
              updatedAt: 1,
              userAttemptsCount: 1,
              user: {
                _id: '$user._id',
                name: '$user.name',
                email: '$user.email',
                phone: '$user.phone',
                avatar: '$user.avatar',
              },
              testSeries: {
                _id: testSeries._id,
                title: testSeries.title,
                thumbnail: testSeries.thumbnail,
                status: testSeries.status,
                isPaid: testSeries.isPaid,
              },
              test: {
                _id: '$test._id',
                title: '$test.title',
                duration: '$test.duration',
                totalQuestions: '$test.totalQuestions',
                totalMarks: '$test.totalMarks',
                status: '$test.status',
              },
            },
          },
        ],
        summary: [
          {
            $group: {
              _id: null,
              totalAttempts: { $sum: 1 },
              startedAttempts: { $sum: { $cond: [{ $eq: ['$status', 'started'] }, 1, 0] } },
              ongoingAttempts: { $sum: { $cond: [{ $eq: ['$status', 'ongoing'] }, 1, 0] } },
              completedAttempts: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
              abandonedAttempts: { $sum: { $cond: [{ $eq: ['$status', 'abandoned'] }, 1, 0] } },
              totalUsers: { $addToSet: '$user._id' },
            },
          },
          {
            $project: {
              _id: 0,
              totalAttempts: 1,
              startedAttempts: 1,
              ongoingAttempts: 1,
              completedAttempts: 1,
              abandonedAttempts: 1,
              totalUsers: { $size: '$totalUsers' },
            },
          },
        ],
      },
    }
  )

  const [result] = await TestSeriesAttempt.aggregate(pipeline)
  const summary = result?.summary?.[0] || {
    totalAttempts: 0,
    startedAttempts: 0,
    ongoingAttempts: 0,
    completedAttempts: 0,
    abandonedAttempts: 0,
    totalUsers: 0,
  }

  const total = summary.totalUsers
  return buildPaginatedResult(result?.data || [], total, page, limit, {
    ...summary,
    testSeries,
  })
}

module.exports = { overview, revenue, users, courseEnrollments, testSeriesAttempts }

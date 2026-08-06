const User       = require('../../models/User.model')
const Enrollment = require('../../models/Enrollment.model')
const TestSeriesAttempt = require('../../models/TestSeriesAttempt.model')
const Course = require('../../models/Course.model')
const CourseOrder      = require('../../models/CourseOrder.model')
const Test       = require('../../models/Test.model')
const TestSeriesTest = require('../../models/TestSeriesTest.model')
const PreviousYearPaperTest = require('../../models/PreviousYearPaperTest.model')
const PreviousYearPaperAttempt = require('../../models/PreviousYearPaperAttempt.model')
const CourseTest = require('../../models/CourseTest.model')
const CourseTestAttempt = require('../../models/CourseTestAttempt.model')
const Question = require('../../models/Question.model')
const Subject = require('../../models/Subject.model')
const { createLogger } = require('../../config/logger')
const AppError = require('../../core/AppError')

const logger = createLogger('admin:analytics:service')

const enrichAttemptsWithAnalytics = async (attempts, testId) => {
  if (!attempts || !attempts.length) return attempts

  // 1. Fetch questions for this test
  const questions = await Question.find({ test: testId, isDeleted: false }).lean()

  // 2. Fetch subject names and their embedded chapters/topics
  const subjectIds = [...new Set(questions.map(q => q.subjectId?.toString()).filter(Boolean))]
  const subjectsList = await Subject.find({ _id: { $in: subjectIds } }).lean()

  // Build lookup maps
  const subjectMap = {}   // id -> name
  const chapterMap = {}   // id -> { name, subjectId }
  const topicMap = {}     // id -> { name, chapterId }

  for (const subject of subjectsList) {
    const sId = subject._id.toString()
    subjectMap[sId] = subject.name

    for (const chapter of (subject.chapters || [])) {
      const cId = chapter._id.toString()
      chapterMap[cId] = { name: chapter.name, subjectId: sId }

      for (const topic of (chapter.topics || [])) {
        const tId = topic._id.toString()
        topicMap[tId] = { name: topic.name, chapterId: cId }
      }
    }
  }

  // Build question details map
  const questionDetails = {}
  for (const q of questions) {
    const qId = q._id.toString()
    
    // Find correct option index
    let correctOptionIndex = -1
    if (q.en?.options) {
      correctOptionIndex = q.en.options.findIndex(o => o.isCorrect)
    }
    if (correctOptionIndex === -1 && q.hi?.options) {
      correctOptionIndex = q.hi.options.findIndex(o => o.isCorrect)
    }

    questionDetails[qId] = {
      subjectId: q.subjectId ? q.subjectId.toString() : null,
      chapterId: q.chapterId ? q.chapterId.toString() : null,
      topicId: q.topicId ? q.topicId.toString() : null,
      correctOptionIndex
    }
  }

  // 3. For each attempt, compute analytics
    return attempts.map(attempt => {
    let computedCorrect = 0
    let computedWrong = 0
    let computedSkipped = 0
    let computedUnattempted = 0

    const sectionWise = new Map()

    const marksPerQuestion = Number(attempt.totalMarks / questions.length) || 1
    const negativeMarks = 0 // Or fetch from test if needed, but attempt doesn't store negativeMarks directly

    // Only process unique logical questions (by order)
    const processedOrders = new Set()

    for (const q of questions) {
      if (processedOrders.has(q.order)) continue
      processedOrders.add(q.order)

      // Calculate Marks logic for this logical question first
      const siblingQuestionIds = questions.filter(sq => sq.order === q.order).map(sq => String(sq._id))
      const ans = (attempt.answers || []).find(a => siblingQuestionIds.includes(String(a.questionId)))

      let isAttempted = false
      let isCorrect = false
      let marksObtained = 0

      if (ans && ans.status !== 'skipped' && ans.selectedOption !== null && ans.selectedOption !== undefined) {
        isAttempted = true
        const answeredQ = questions.find(sq => String(sq._id) === String(ans.questionId))
        
        let correctIndex = -1
        if (answeredQ) {
          if (answeredQ.en?.options) correctIndex = answeredQ.en.options.findIndex(opt => opt.isCorrect)
          if (correctIndex === -1 && answeredQ.hi?.options) correctIndex = answeredQ.hi.options.findIndex(opt => opt.isCorrect)
        }

        if (correctIndex !== -1 && ans.selectedOption === correctIndex) {
          isCorrect = true
          marksObtained = marksPerQuestion
        } else {
          marksObtained = 0 // assuming no negative marks or default to 0
        }
      }

      if (isAttempted) {
        if (isCorrect) computedCorrect++
        else computedWrong++
      } else if (ans && ans.status === 'skipped') {
        computedSkipped++
      } else {
        computedUnattempted++
      }

      const qId = q._id.toString()
      const qInfo = questionDetails[qId]
      if (!qInfo) continue

      const sId = qInfo.subjectId ? String(qInfo.subjectId) : 'uncategorized'
      const foundSubj = subjectsList.find(s => s._id.toString() === sId)
      const subjectName = foundSubj ? foundSubj.name : 'Uncategorized'

      const chaptersToProcess = qInfo.chapterId ? [qInfo.chapterId] : ['uncategorized']
      const topicsToProcess = qInfo.topicId ? [qInfo.topicId] : ['uncategorized']

      if (!sectionWise.has(sId)) {
        sectionWise.set(sId, {
          subject: { _id: sId === 'uncategorized' ? null : sId, name: subjectName },
          score: 0,
          totalMarks: 0,
          attempted: 0,
          totalQuestions: 0,
          correct: 0,
          wrong: 0,
          skipped: 0,
          unattempted: 0,
          chapters: new Map()
        })
      }

      const sec = sectionWise.get(sId)
      sec.totalQuestions++
      sec.totalMarks += marksPerQuestion
      if (isAttempted) {
        sec.attempted++
        if (isCorrect) sec.correct++
        else sec.wrong++
        sec.score += marksObtained
      } else if (ans && ans.status === 'skipped') {
        sec.skipped++
      } else {
        sec.unattempted++
      }

      for (const chap of chaptersToProcess) {
        const chapterId = String(chap)
        let chapterName = 'Uncategorized'
        if (foundSubj && foundSubj.chapters && chapterId !== 'uncategorized') {
          const foundChapter = foundSubj.chapters.find((c) => String(c._id) === chapterId)
          if (foundChapter) chapterName = foundChapter.name
        }

        if (!sec.chapters.has(chapterId)) {
          sec.chapters.set(chapterId, {
            chapter: { _id: chapterId === 'uncategorized' ? null : chapterId, name: chapterName },
            score: 0,
            totalMarks: 0,
            attempted: 0,
            totalQuestions: 0,
            correct: 0,
            wrong: 0,
            skipped: 0,
            unattempted: 0,
            topics: new Map()
          })
        }

        const chapStats = sec.chapters.get(chapterId)
        chapStats.totalQuestions++
        chapStats.totalMarks += marksPerQuestion
        if (isAttempted) {
          chapStats.attempted++
          if (isCorrect) chapStats.correct++
          else chapStats.wrong++
          chapStats.score += marksObtained
        } else if (ans && ans.status === 'skipped') {
          chapStats.skipped++
        } else {
          chapStats.unattempted++
        }

        for (const top of topicsToProcess) {
          const topicId = String(top)
          let topicName = 'Uncategorized'
          if (foundSubj && foundSubj.chapters && chapterId !== 'uncategorized' && topicId !== 'uncategorized') {
            const foundChapter = foundSubj.chapters.find((c) => String(c._id) === chapterId)
            if (foundChapter && foundChapter.topics) {
              const foundTopic = foundChapter.topics.find((t) => String(t._id) === topicId)
              if (foundTopic) topicName = foundTopic.name
            }
          }

          if (!chapStats.topics.has(topicId)) {
            chapStats.topics.set(topicId, {
              topic: { _id: topicId === 'uncategorized' ? null : topicId, name: topicName },
              score: 0,
              totalMarks: 0,
              attempted: 0,
              totalQuestions: 0,
              correct: 0,
              wrong: 0,
              skipped: 0,
              unattempted: 0,
            })
          }

          const topStats = chapStats.topics.get(topicId)
          topStats.totalQuestions++
          topStats.totalMarks += marksPerQuestion
          if (isAttempted) {
            topStats.attempted++
            if (isCorrect) topStats.correct++
            else topStats.wrong++
            topStats.score += marksObtained
          } else if (ans && ans.status === 'skipped') {
            topStats.skipped++
          } else {
            topStats.unattempted++
          }
        }
      }
    }

    const sectionWisePerformance = Array.from(sectionWise.values()).map(sec => ({
      subject: sec.subject,
      score: sec.score,
      totalMarks: sec.totalMarks,
      attempted: sec.attempted,
      totalQuestions: sec.totalQuestions,
      correct: sec.correct,
      wrong: sec.wrong,
      skipped: sec.skipped,
      unattempted: sec.unattempted,
      accuracy: sec.attempted > 0 ? parseFloat(((sec.correct / sec.attempted) * 100).toFixed(2)) : 0,
      chapters: Array.from(sec.chapters.values()).map(chap => {
        const hasRealTopics = Array.from(chap.topics.values()).some(t => t.topic._id !== null)
        return {
          chapter: chap.chapter,
          score: chap.score,
          totalMarks: chap.totalMarks,
          attempted: chap.attempted,
          totalQuestions: chap.totalQuestions,
          correct: chap.correct,
          wrong: chap.wrong,
          skipped: chap.skipped,
          unattempted: chap.unattempted,
          ...(hasRealTopics ? {} : { isWeak: chap.totalQuestions > 0 ? (chap.correct / chap.totalQuestions) < 0.5 : false }),
          percentage: chap.totalMarks > 0 ? parseFloat(((Math.max(0, chap.score) / chap.totalMarks) * 100).toFixed(2)) : 0,
          topics: Array.from(chap.topics.values()).map(top => ({
            topic: top.topic,
            score: top.score,
            totalMarks: top.totalMarks,
            attempted: top.attempted,
            totalQuestions: top.totalQuestions,
            correct: top.correct,
            wrong: top.wrong,
            skipped: top.skipped,
            unattempted: top.unattempted,
            isWeak: top.totalQuestions > 0 ? (top.correct / top.totalQuestions) < 0.5 : false,
            percentage: top.totalMarks > 0 ? parseFloat(((Math.max(0, top.score) / top.totalMarks) * 100).toFixed(2)) : 0
          }))
        }
      })
    }))

    // Return the enriched attempt
    return {
      rank: attempt.rank,
      score: attempt.score,
      totalMarks: attempt.totalMarks,
      accuracy: attempt.accuracy,
      timeTaken: attempt.timeTaken,
      user: attempt.user,
      overallStats: {
        correct: computedCorrect || attempt.correct || 0,
        wrong: computedWrong || attempt.wrong || 0,
        skipped: computedSkipped || attempt.skipped || 0,
        unattempted: computedUnattempted || attempt.unattempted || 0,
        attemptedCount: (computedCorrect || attempt.correct || 0) + (computedWrong || attempt.wrong || 0),
        totalQuestions: questions.length
      },
      sectionWisePerformance
    }
  })
}

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



const testLeaderboard = async (testId, filters = {}) => {

  const test = await TestSeriesTest.findOne({
    _id: testId
  })
  .select('_id title totalMarks duration status')
  .lean()


  if (!test) {
    throw new AppError(
      'Test not found',
      404
    )
  }


  const { page, limit, skip } = buildPagination(
    filters.page,
    filters.limit
  )


  const fromRank = filters.fromRank
    ? Number(filters.fromRank)
    : null


  const toRank = filters.toRank
    ? Number(filters.toRank)
    : null

  const fromScore = filters.fromScore !== undefined ? Number(filters.fromScore) : null
  const toScore = filters.toScore !== undefined ? Number(filters.toScore) : null


  const pipeline = [

    // only selected test
    {
      $match: {
        test: test._id,
        status: 'completed'
      }
    },


    // user details
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user'
      }
    },


    {
      $unwind: '$user'
    },


    {
      $match: {
        'user.role': 'user',
        'user.isDeleted': {
          $ne: true
        }
      }
    },


    // oldest attempt first
    {
      $sort: {
        attemptedAt: 1
      }
    },


    // one record per user
    {
      $group: {

        _id: '$user._id',

        score: {
          $first: '$score'
        },

        totalMarks: {
          $first: '$totalMarks'
        },

        accuracy: {
          $first: '$accuracy'
        },

        timeTaken: {
          $first: '$timeTaken'
        },

        correct: {
          $first: '$correct'
        },

        wrong: {
          $first: '$wrong'
        },

        skipped: {
          $first: '$skipped'
        },

        unattempted: {
          $first: '$unattempted'
        },

        answers: {
          $first: '$answers'
        },

        user: {
          $first: '$user'
        }

      }
    }
  ]

  if (fromScore !== null || toScore !== null) {
    const scoreMatch = {}
    if (fromScore !== null) scoreMatch.$gte = fromScore
    if (toScore !== null) scoreMatch.$lte = toScore
    pipeline.push({ $match: { score: scoreMatch } })
  }

  pipeline.push(
    // create rank
    {
      $setWindowFields: {

        sortBy: {
          score: -1
        },

        output: {

          rank: {
            $rank: {}
          }

        }

      }
    }
  )


  // rank range filter
  if (fromRank && toRank) {

    pipeline.push({

      $match: {

        rank: {
          $gte: fromRank,
          $lte: toRank
        }

      }

    })

  }
  pipeline.push({

    $facet: {
      data: [
        {
          $sort: {
            rank: 1
          }
        },
        {
          $skip: skip
        },
        {
          $limit: limit
        },
        {
          $project: {
            _id: 0,
            rank: 1,
            score: 1,
            totalMarks: 1,
            accuracy: 1,
            timeTaken: 1,
            correct: 1,
            wrong: 1,
            skipped: 1,
            unattempted: 1,
            answers: 1,
            user: {

              _id: '$user._id',

              name: '$user.name',

              email: '$user.email',

              phone: '$user.phone',

              // avatar: '$user.avatar'

            }

          }

        }

      ],



      summary: [

        {
          $count: 'totalUsers'
        }

      ]

    }

  })



  const [result] = await TestSeriesAttempt.aggregate(
    pipeline
  )



  const totalUsers =
    result?.summary?.[0]?.totalUsers || 0


  const enrichedData = await enrichAttemptsWithAnalytics(result?.data || [], test._id)

  return buildPaginatedResult(

    enrichedData,

    totalUsers,

    page,

    limit,

    {

      test,

      totalUsers,

      rankRange: {

        fromRank,

        toRank

      }

    }

  )

}


const previousYearPaperTestLeaderboard = async (testId, filters = {}) => {
  const test = await PreviousYearPaperTest.findOne({
    _id: testId
  })
  .select('_id title totalMarks duration status')
  .lean()

  if (!test) {
    throw new AppError('Test not found', 404)
  }

  const { page, limit, skip } = buildPagination(filters.page, filters.limit)
  const fromRank = filters.fromRank ? Number(filters.fromRank) : null
  const toRank = filters.toRank ? Number(filters.toRank) : null
  const fromScore = filters.fromScore !== undefined ? Number(filters.fromScore) : null
  const toScore = filters.toScore !== undefined ? Number(filters.toScore) : null

  const pipeline = [
    {
      $match: {
        test: test._id,
        status: 'completed'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $unwind: '$user'
    },
    {
      $match: {
        'user.role': 'user',
        'user.isDeleted': { $ne: true }
      }
    },
    {
      $sort: {
        attemptedAt: 1
      }
    },
    {
      $group: {
        _id: '$user._id',
        score: { $first: '$score' },
        totalMarks: { $first: '$totalMarks' },
        accuracy: { $first: '$accuracy' },
        timeTaken: { $first: '$timeTaken' },
        correct: { $first: '$correct' },
        wrong: { $first: '$wrong' },
        skipped: { $first: '$skipped' },
        unattempted: { $first: '$unattempted' },
        answers: { $first: '$answers' },
        user: { $first: '$user' }
      }
    }
  ]

  if (fromScore !== null || toScore !== null) {
    const scoreMatch = {}
    if (fromScore !== null) scoreMatch.$gte = fromScore
    if (toScore !== null) scoreMatch.$lte = toScore
    pipeline.push({ $match: { score: scoreMatch } })
  }

  pipeline.push(
    {
      $setWindowFields: {
        sortBy: { score: -1 },
        output: {
          rank: { $rank: {} }
        }
      }
    }
  )

  if (fromRank && toRank) {
    pipeline.push({
      $match: {
        rank: {
          $gte: fromRank,
          $lte: toRank
        }
      }
    })
  }

  pipeline.push({
    $facet: {
      data: [
        { $sort: { rank: 1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            _id: 0,
            rank: 1,
            score: 1,
            totalMarks: 1,
            accuracy: 1,
            timeTaken: 1,
            correct: 1,
            wrong: 1,
            skipped: 1,
            unattempted: 1,
            answers: 1,
            user: {
              _id: '$user._id',
              name: '$user.name',
              email: '$user.email',
              phone: '$user.phone',
              // avatar: '$user.avatar'
            }
          }
        }
      ],
      summary: [
        { $count: 'totalUsers' }
      ]
    }
  })

  const [result] = await PreviousYearPaperAttempt.aggregate(pipeline)
  const totalUsers = result?.summary?.[0]?.totalUsers || 0

  const enrichedData = await enrichAttemptsWithAnalytics(result?.data || [], test._id)

  return buildPaginatedResult(
    enrichedData,
    totalUsers,
    page,
    limit,
    {
      test,
      totalUsers,
      rankRange: {
        fromRank,
        toRank
      }
    }
  )
}


const courseTestLeaderboard = async (testId, filters = {}) => {
  const test = await CourseTest.findOne({
    _id: testId
  })
  .select('_id title totalMarks duration status course')
  .lean()

  if (!test) {
    throw new AppError('Test not found', 404)
  }

  const { page, limit, skip } = buildPagination(filters.page, filters.limit)
  const fromRank = filters.fromRank ? Number(filters.fromRank) : null
  const toRank = filters.toRank ? Number(filters.toRank) : null
  const fromScore = filters.fromScore !== undefined ? Number(filters.fromScore) : null
  const toScore = filters.toScore !== undefined ? Number(filters.toScore) : null

  const pipeline = [
    {
      $match: {
        courseTest: test._id,
        status: 'completed'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $unwind: '$user'
    },
    {
      $match: {
        'user.role': 'user',
        'user.isDeleted': { $ne: true }
      }
    },
    {
      $sort: {
        attemptedAt: 1
      }
    },
    {
      $group: {
        _id: '$user._id',
        score: { $first: '$score' },
        totalMarks: { $first: '$totalMarks' },
        accuracy: { $first: '$accuracy' },
        timeTaken: { $first: '$timeTaken' },
        correct: { $first: '$correct' },
        wrong: { $first: '$wrong' },
        skipped: { $first: '$skipped' },
        unattempted: { $first: '$unattempted' },
        answers: { $first: '$answers' },
        user: { $first: '$user' }
      }
    }
  ]

  if (fromScore !== null || toScore !== null) {
    const scoreMatch = {}
    if (fromScore !== null) scoreMatch.$gte = fromScore
    if (toScore !== null) scoreMatch.$lte = toScore
    pipeline.push({ $match: { score: scoreMatch } })
  }

  pipeline.push(
    {
      $setWindowFields: {
        sortBy: { score: -1 },
        output: {
          rank: { $rank: {} }
        }
      }
    }
  )

  if (fromRank && toRank) {
    pipeline.push({
      $match: {
        rank: {
          $gte: fromRank,
          $lte: toRank
        }
      }
    })
  }

  pipeline.push({
    $facet: {
      data: [
        { $sort: { rank: 1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            _id: 0,
            rank: 1,
            score: 1,
            totalMarks: 1,
            accuracy: 1,
            timeTaken: 1,
            correct: 1,
            wrong: 1,
            skipped: 1,
            unattempted: 1,
            answers: 1,
            user: {
              _id: '$user._id',
              name: '$user.name',
              email: '$user.email',
              phone: '$user.phone',
            }
          }
        }
      ],
      summary: [
        { $count: 'totalUsers' }
      ]
    }
  })

  const [result] = await CourseTestAttempt.aggregate(pipeline)
  const totalUsers = result?.summary?.[0]?.totalUsers || 0

  const enrichedData = await enrichAttemptsWithAnalytics(result?.data || [], test._id)

  return buildPaginatedResult(
    enrichedData,
    totalUsers,
    page,
    limit,
    {
      test,
      totalUsers,
      rankRange: {
        fromRank,
        toRank
      }
    }
  )
}

module.exports = { 
  overview, 
  revenue, 
  users, 
  courseEnrollments,  
  testLeaderboard, 
  previousYearPaperTestLeaderboard,
  courseTestLeaderboard
}

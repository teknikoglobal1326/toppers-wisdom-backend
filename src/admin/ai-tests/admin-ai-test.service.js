const BaseService = require('../../core/BaseService')
const aiTestRepository = require('../../modules/ai-test/ai-test.repository')
const AiTest = require('../../models/AiTest.model')
const AiTestAttempt = require('../../models/AiTestAttempt.model')
const User = require('../../models/User.model')
const AppError = require('../../core/AppError')
const { createLogger } = require('../../config/logger')

class AdminAiTestService extends BaseService {
  constructor() {
    super(aiTestRepository, 'admin:ai-test')
    this.logger = createLogger('admin:ai-test:service')
  }

  async listAll(query = {}) {
    const page = Math.max(1, Number(query.page) || 1)
    const limit = Math.max(1, Number(query.limit) || 10)
    const skip = (page - 1) * limit

    const filter = { isDeleted: false }

    if (query.user) {
      filter.user = query.user
    }

    if (query.subject) {
      filter.subjects = query.subject
    }

    if (query.search && query.search.trim()) {
      const regex = new RegExp(query.search.trim(), 'i')
      const matchingUsers = await User.find({
        $or: [
          { name: regex },
          { email: regex },
          { phone: regex }
        ]
      }).select('_id').lean()
      const userIds = matchingUsers.map(u => u._id)

      filter.$or = [
        { name: regex },
        { user: { $in: userIds } }
      ]
    }

    const sortOrder = query.sortOrder === 'asc' ? 1 : -1
    const sortField = query.sortBy || 'createdAt'
    const sort = { [sortField]: sortOrder }

    const [total, tests] = await Promise.all([
      AiTest.countDocuments(filter),
      AiTest.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email phone avatar')
        .populate('subjects', 'name chapters')
        .lean()
    ])

    const data = tests.map(test => {
      const chapterNames = []
      const topicNames = []

      const selectChapters = (test.chapters || []).map(String)
      const selectTopics = (test.topics || []).map(String)

      ;(test.subjects || []).forEach(subj => {
        if (subj && subj.chapters) {
          subj.chapters.forEach(chap => {
            if (selectChapters.includes(String(chap._id))) {
              chapterNames.push({ _id: chap._id, name: chap.name })
            }
            if (chap.topics) {
              chap.topics.forEach(topic => {
                if (selectTopics.includes(String(topic._id))) {
                  topicNames.push({ _id: topic._id, name: topic.name })
                }
              })
            }
          })
        }
      })

      const cleanSubjects = (test.subjects || []).map(s => ({ _id: s._id, name: s.name }))

      return {
        ...test,
        subjects: cleanSubjects,
        chapters: chapterNames,
        topics: topicNames
      }
    })

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  async getOne(id) {
    const test = await AiTest.findOne({ _id: id, isDeleted: false })
      .populate('user', 'name email phone avatar')
      .populate('subjects', 'name chapters')
      .lean()

    if (!test) {
      throw new AppError('AI Test not found', 404, 'NOT_FOUND')
    }

    const chapterNames = []
    const topicNames = []
    const selectChapters = (test.chapters || []).map(String)
    const selectTopics = (test.topics || []).map(String)

    ;(test.subjects || []).forEach(subj => {
      if (subj && subj.chapters) {
        subj.chapters.forEach(chap => {
          if (selectChapters.includes(String(chap._id))) {
            chapterNames.push({ _id: chap._id, name: chap.name })
          }
          if (chap.topics) {
            chap.topics.forEach(topic => {
              if (selectTopics.includes(String(topic._id))) {
                topicNames.push({ _id: topic._id, name: topic.name })
              }
            })
          }
        })
      }
    })

    const cleanSubjects = (test.subjects || []).map(s => ({ _id: s._id, name: s.name }))

    const attempts = await AiTestAttempt.find({ aiTest: id })
      .sort({ attemptedAt: -1 })
      .select('sessionId score totalMarks accuracy timeTaken status attemptedAt')
      .lean()

    return {
      ...test,
      subjects: cleanSubjects,
      chapters: chapterNames,
      topics: topicNames,
      attempts
    }
  }

  async deleteTest(id) {
    const test = await AiTest.findOne({ _id: id, isDeleted: false })
    if (!test) {
      throw new AppError('AI Test not found', 404, 'NOT_FOUND')
    }
    test.isDeleted = true
    await test.save()
    return { id, message: 'AI Test deleted successfully' }
  }
}

module.exports = new AdminAiTestService()

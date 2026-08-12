const BaseRepository = require('../../core/BaseRepository')
const AiTest = require('../../models/AiTest.model')
const Subject = require('../../models/Subject.model')
const Question = require('../../models/Question.model')
const AiTestAttempt = require('../../models/AiTestAttempt.model')

class AiTestRepository extends BaseRepository {
  constructor() {
    super(AiTest, 'ai-test')
  }

  async getActiveSubjects(filter = {}) {
    return Subject.find({ isDeleted: false, status: 'active', ...filter })
      .select('_id name sortOrder chapters')
      .sort({ sortOrder: 1, name: 1 })
      .lean()
  }

  async findQuestions(query) {
    return Question.find(query).lean()
  }

  async createAttempt(payload) {
    return AiTestAttempt.create(payload)
  }

  async getAttemptBySession(sessionId, userId) {
    return AiTestAttempt.findOne({ sessionId, user: userId })
  }
}

module.exports = new AiTestRepository()

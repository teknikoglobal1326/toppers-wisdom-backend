const BaseRepository = require('../../core/BaseRepository')
const Test        = require('../../models/Test.model')
const TestAttempt = require('../../models/TestAttempt.model')

class TestRepository extends BaseRepository {
  constructor() {
    super(Test, 'test')
  }

  async createAttempt(data) {
    return TestAttempt.create(data)
  }

  async getAttemptsByUser(userId, options) {
    const { paginate } = require('../../core/paginate')
    return paginate(TestAttempt, { user: userId }, { ...options, sort: { attemptedAt: -1 }, populate: { path: 'test', select: 'title type' } })
  }

  async getLeaderboard(testId) {
    return TestAttempt.find({ test: testId, status: 'completed' })
      .sort({ score: -1, timeTaken: 1 }).limit(50)
      .populate('user', 'name avatar').lean()
  }
}

module.exports = new TestRepository()
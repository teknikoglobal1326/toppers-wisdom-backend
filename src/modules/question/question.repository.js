const BaseRepository = require('../../core/BaseRepository')
const Question = require('../../models/Question.model')

class QuestionRepository extends BaseRepository {
  constructor() {
    super(Question, 'question')
  }

  async createSingle(data) {
    return this.create(data)
  }

  // Highest `order` currently used for a test (0 when none) — used to auto-assign the next order.
  async getMaxOrder(testId) {
    const last = await Question.findOne({ test: testId, isDeleted: false })
      .sort({ order: -1 })
      .select('order')
      .lean()
    return last?.order || 0
  }
}

module.exports = new QuestionRepository()

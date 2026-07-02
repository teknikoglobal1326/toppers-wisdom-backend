const BaseRepository = require('../../core/BaseRepository')
const Question = require('../../models/Question.model')

class QuestionRepository extends BaseRepository {
  constructor() {
    super(Question, 'question')
  }

  async createPair(data) {
    const primary = await this.create({
      ...data,
      language: 'en',
    })

    const secondary = await this.create({
      ...data,
      language: 'hi',
    })

    return [primary, secondary]
  }

  async createSingle(data) {
    return this.create({
      ...data,
      language: data.language || 'both',
    })
  }
}

module.exports = new QuestionRepository()

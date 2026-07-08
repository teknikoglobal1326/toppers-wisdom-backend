const BaseService      = require('../../core/BaseService')
const testRepository   = require('../../modules/test/test.repository')
const AppError         = require('../../core/AppError')
const { createLogger } = require('../../config/logger')

class AdminTestService extends BaseService {
  constructor() {
    super(testRepository, 'admin:test')
    this.logger = createLogger('admin:test:service')
  }

  normalizePayload(data = {}) {
    const payload = { ...data }
    if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
      const parsedSortOrder = Number(payload.sortOrder)
      if (!Number.isNaN(parsedSortOrder)) payload.sortOrder = parsedSortOrder
    }
    return payload
  }

  async listAll(filters) {
    const filter = {}
    if (filters.status)  filter.status  = filters.status
    if (filters.subExam) filter.subExam = filters.subExam
    if (filters.type)    filter.type    = filters.type
    const direction = filters.sortOrder === 'desc' ? -1 : 1
    return this.getAll(filter, {
      page: filters.page,
      limit: filters.limit,
      sort: { sortOrder: direction, createdAt: -1 },
      select: '-subTests.questions',
    })
  }

  async create(data) {
    return super.create(this.normalizePayload(data))
  }

  async update(id, data) {
    return super.update(id, this.normalizePayload(data))
  }

  async publish(testId) {
    this.logger.info({ testId }, 'Publishing test')
    return this.update(testId, { status: 'published' })
  }

  async addSubTest(testId, subTestData) {
    this.logger.info({ testId }, 'Adding sub-test')
    return testRepository.pushToArray(testId, 'subTests', subTestData)
  }

  async addQuestion(testId, subTestId, question) {
    this.logger.info({ testId, subTestId }, 'Adding question')
    return testRepository.model.findOneAndUpdate(
      { _id: testId, 'subTests._id': subTestId },
      { $push: { 'subTests.$.questions': question } },
      { new: true }
    ).lean()
  }

  async bulkAddQuestions(testId, subTestId, questions) {
    this.logger.info({ testId, subTestId, count: questions.length }, 'Bulk adding questions')
    return testRepository.model.findOneAndUpdate(
      { _id: testId, 'subTests._id': subTestId },
      { $push: { 'subTests.$.questions': { $each: questions } } },
      { new: true }
    ).lean()
  }

  async removeQuestion(testId, subTestId, questionId) {
    this.logger.info({ testId, subTestId, questionId }, 'Removing question')
    return testRepository.model.findOneAndUpdate(
      { _id: testId, 'subTests._id': subTestId },
      { $pull: { 'subTests.$.questions': { _id: questionId } } },
      { new: true }
    ).lean()
  }
}

module.exports = new AdminTestService()

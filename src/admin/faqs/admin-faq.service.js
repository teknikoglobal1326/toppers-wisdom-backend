const BaseService = require('../../core/BaseService')
const AppError = require('../../core/AppError')
const faqRepository = require('../../modules/faq/faq.repository')

class AdminFaqService extends BaseService {
  constructor() {
    super(faqRepository, 'admin:faq')
  }

  buildFilter({ status, question, search } = {}) {
    const filter = { isDeleted: false }

    if (status) filter.status = status
    if (question) filter.question = { $regex: question, $options: 'i' }

    if (search) {
      filter.question = { $regex: search, $options: 'i' }
    }

    return filter
  }

  buildPayload(data = {}) {
    const payload = { ...data }

    if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
      const parsedSortOrder = Number(payload.sortOrder)
      if (!Number.isNaN(parsedSortOrder)) payload.sortOrder = parsedSortOrder
    }

    return payload
  }

  async listAll(query = {}) {
    const filter = this.buildFilter(query)
    const direction = query.sortOrder === 'desc' ? -1 : 1
    const sortBy = query.sortBy || 'sortOrder'

    return this.getAll(filter, {
      page: query.page,
      limit: query.limit,
      sort: { [sortBy]: direction, createdAt: -1 },
    })
  }

  async getOne(id) {
    const faq = await faqRepository.findOne({ _id: id, isDeleted: false })
    if (!faq) throw new AppError('Faq not found', 404, 'NOT_FOUND')
    return faq
  }

  async createFaq(data) {
    return this.create(this.buildPayload(data))
  }

  async updateFaq(id, data) {
    const existing = await faqRepository.findOne({ _id: id, isDeleted: false })
    if (!existing) throw new AppError('Faq not found', 404, 'NOT_FOUND')
    return faqRepository.updateById(id, this.buildPayload(data))
  }

  async softDelete(id) {
    const existing = await faqRepository.findOne({ _id: id, isDeleted: false })
    if (!existing) throw new AppError('Faq not found', 404, 'NOT_FOUND')

    await faqRepository.updateById(id, { isDeleted: true, status: 'inactive' })
    this.logger.info({ faqId: id }, 'Faq soft deleted')
  }
}

module.exports = new AdminFaqService()

const BaseService = require('../../core/BaseService')
const AppError = require('../../core/AppError')
const grammarCategoryRepository = require('../../modules/grammar-category/grammar-category.repository')

class AdminGrammarCategoryService extends BaseService {
  constructor() {
    super(grammarCategoryRepository, 'admin:grammar-category')
  }

  buildFilter({ status, search } = {}) {
    const filter = { isDeleted: false }

    if (status) filter.status = status

    if (search) {
      filter.name = new RegExp(search, 'i')
    }

    return filter
  }

  async listAll(query = {}) {
    const filter = this.buildFilter(query)
    const direction = query.sortOrder === 'desc' ? -1 : 1
    const sortBy = query.sortBy || 'sortOrder'

    return this.getAll(filter, {
      page: query.page,
      limit: query.limit,
      sort: { [sortBy]: direction, createdAt: -1 }
    })
  }

  async getOne(id) {
    const category = await grammarCategoryRepository.findOne({ _id: id, isDeleted: false })
    if (!category) throw new AppError('Grammar category not found', 404, 'NOT_FOUND')
    return category
  }

  normalizePayload(data = {}) {
    const payload = { ...data }

    if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
      const parsed = Number(payload.sortOrder)
      if (!Number.isNaN(parsed)) payload.sortOrder = parsed
    }

    return payload
  }

  async createGrammarCategory(data) {
    return this.create(this.normalizePayload(data))
  }

  async updateGrammarCategory(id, data) {
    const existing = await grammarCategoryRepository.findOne({ _id: id, isDeleted: false })
    if (!existing) throw new AppError('Grammar category not found', 404, 'NOT_FOUND')

    return grammarCategoryRepository.updateById(id, this.normalizePayload(data))
  }

  async softDelete(id) {
    const existing = await grammarCategoryRepository.findOne({ _id: id, isDeleted: false })
    if (!existing) throw new AppError('Grammar category not found', 404, 'NOT_FOUND')

    return grammarCategoryRepository.updateById(id, {
      isDeleted: true,
      status: 'inactive'
    })
  }
}

module.exports = new AdminGrammarCategoryService()

const BaseService = require('../../core/BaseService')
const shortRepository = require('./short.repository')
const User = require('../../models/User.model')

class ShortService extends BaseService {
  constructor() {
    super(shortRepository, 'short')
  }

  async listShorts(userId, categoryId, filters) {
    const filter = { isDeleted: false, status: 'active', categoryId }

    return this.getAll(filter, {
      page: filters.page,
      limit: filters.limit,
      sort: { sortOrder: 1, createdAt: -1 },
      select: 'title videoUrl thumbnail categoryId sortOrder',
    })
  }
}

module.exports = new ShortService()

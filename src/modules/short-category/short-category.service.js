const BaseService = require('../../core/BaseService')
const shortCategoryRepository = require('./short-category.repository')
const User = require('../../models/User.model')

class ShortCategoryService extends BaseService {
  constructor() {
    super(shortCategoryRepository, 'shortCategory')
  }

  async listCategories(userId, filters) {
    const user = await User.findById(userId).select('exam').lean()

    const filter = { isDeleted: false, status: 'active' }

    if (user?.exam) {
      filter.examIds = { $in: [user.exam] }
    }

    const result = await this.getAll(filter, {
      page: filters.page,
      limit: filters.limit,
      sort: { createdAt: -1 },
      select: 'name bannerImage logo tags examIds createdAt',
    })

    const Short = require('../../models/Short.model')

    const shorts = await Promise.all(
      result.data.map((cat) =>
        Short.findOne({ categoryId: cat._id, isDeleted: false, status: 'active' })
          .sort({ sortOrder: 1, createdAt: -1 })
          .select('videoUrl')
          .lean()
      )
    )

    result.data = result.data.map((cat, index) => {
      // Handle both plain objects and mongoose documents
      const catObj = cat.toObject ? cat.toObject() : cat
      return {
        ...catObj,
        short: shorts[index] || null,
      }
    })

    return result
  }
}

module.exports = new ShortCategoryService()

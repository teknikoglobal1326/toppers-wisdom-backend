const BaseService = require('../../core/BaseService')
const shortRepository = require('./short.repository')
const User = require('../../models/User.model')

class ShortService extends BaseService {
  constructor() {
    super(shortRepository, 'short')
  }

  async listShorts(userId, filters) {
    const user = await User.findById(userId).select('exam subExams').lean()

    const filter = { isDeleted: false, status: 'active' }

    if (user?.subExams?.length) {
      filter.subexamId = { $in: user.subExams.map((s) => s._id) }
    }

    return this.getAll(filter, {
      page:   filters.page,
      limit:  filters.limit,
      sort:   { createdAt: -1 },
      select: 'title videoUrl thumbnail examId subexamId language createdAt',
    })
  }
}

module.exports = new ShortService()

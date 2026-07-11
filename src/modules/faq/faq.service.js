const BaseService = require('../../core/BaseService')
const faqRepository = require('./faq.repository')

class FaqService extends BaseService {
    constructor() {
        super(faqRepository, 'faq:user')
    }

    buildFilter({ courseId, search } = {}) {
        const filter = { isDeleted: false, status: 'active' }

        if (courseId) filter.course = courseId
        if (search) {
            filter.$or = [
                { question: { $regex: search, $options: 'i' } },
                { answer: { $regex: search, $options: 'i' } },
            ]
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
            sort: { [sortBy]: direction, createdAt: -1 },
            select: 'course question answer sortOrder status createdAt updatedAt',
        })
    }
}

module.exports = new FaqService()

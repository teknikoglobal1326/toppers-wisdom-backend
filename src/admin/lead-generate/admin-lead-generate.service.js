const BaseService = require('../../core/BaseService')
const AppError = require('../../core/AppError')
const leadGenerateRepository = require('../../modules/lead-generate/lead-generate.repository')

class AdminLeadGenerateService extends BaseService {
  constructor() {
    super(leadGenerateRepository, 'admin:lead-generate')
  }

  buildFilter({ isRead, purposeType, subType, visitType } = {}) {
    const filter = {}

    if (isRead !== undefined) {
      // Joi casts boolean, but query string might be string 'true' or 'false'
      filter.isRead = isRead === 'true' || isRead === true
    }
    if (purposeType) filter.purposeType = purposeType
    if (subType) filter.subType = subType
    if (visitType) filter.visitType = visitType

    return filter
  }

  async listAll(query = {}) {
    const filter = this.buildFilter(query)
    const direction = query.sortOrder !== undefined ? Number(query.sortOrder) : -1
    const sortBy = query.sortBy || 'createdAt'

    return this.getAll(filter, {
      page: query.page,
      limit: query.limit,
      sort: { [sortBy]: direction },
      populate: { path: 'user', select: 'name email phone' }
    })
  }

  async updateLead(id, data) {
    const lead = await leadGenerateRepository.findOne({ _id: id })
    if (!lead) throw new AppError('Lead not found', 404, 'NOT_FOUND')

    return leadGenerateRepository.updateById(id, { isRead: data.isRead })
  }
}

module.exports = new AdminLeadGenerateService()

const BaseService = require('../../core/BaseService')
const AppError = require('../../core/AppError')
const leadGenerateRepository = require('../../modules/lead-generate/lead-generate.repository')

class AdminLeadGenerateService extends BaseService {
  constructor() {
    super(leadGenerateRepository, 'admin:lead-generate')
  }

  async buildFilter({ isRead, purposeType, subType, visitType, leadStatus, search, startDate, endDate } = {}) {
    const filter = {}

    if (isRead !== undefined && isRead !== '' && isRead !== 'all') {
      filter.isRead = isRead === 'true' || isRead === true
    }
    if (purposeType && purposeType !== 'all') filter.purposeType = purposeType
    if (subType && subType !== 'all') filter.subType = subType
    if (visitType && visitType !== 'all') filter.visitType = visitType

    if (leadStatus && leadStatus !== 'all') {
      if (leadStatus === 'hot') {
        filter.$or = [
          { leadStatus: 'hot' },
          { visitType: 'payment_failed' }
        ]
      } else if (leadStatus === 'warm') {
        filter.$or = [
          { leadStatus: 'warm' },
          { visitType: { $in: ['detail', 'checkout', 'contentCheckout', 'banner'] } }
        ]
      } else if (leadStatus === 'cold') {
        filter.$or = [
          { leadStatus: 'cold' },
          { visitType: 'onboarding' }
        ]
      }
    }

    if (startDate || endDate) {
      filter.createdAt = {}
      if (startDate) filter.createdAt.$gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        filter.createdAt.$lte = end
      }
    }

    if (search && search.trim()) {
      try {
        const User = require('../../models/User.model')
        const regex = new RegExp(search.trim(), 'i')
        const users = await User.find({
          $or: [{ name: regex }, { email: regex }, { phone: regex }]
        }).select('_id').lean()
        const userIds = users.map(u => u._id)
        filter.user = { $in: userIds }
      } catch (e) {
        // Fallback if user search fails
      }
    }

    return filter
  }

  async listAll(query = {}) {
    const filter = await this.buildFilter(query)
    const direction = query.sortOrder !== undefined ? Number(query.sortOrder) : -1
    const sortBy = query.sortBy || 'createdAt'

    return this.getAll(filter, {
      page: query.page,
      limit: query.limit,
      sort: { [sortBy]: direction },
      populate: { path: 'user', select: 'name email phone' }
    })
  }

  async exportLeads(query = {}) {
    const filter = await this.buildFilter(query)
    const direction = query.sortOrder !== undefined ? Number(query.sortOrder) : -1
    const sortBy = query.sortBy || 'createdAt'
    const User = require('../../models/User.model')

    return leadGenerateRepository.find(filter, {
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

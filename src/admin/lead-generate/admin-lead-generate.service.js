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

  async resolveItemNames(leads) {
    if (!Array.isArray(leads) || leads.length === 0) return leads

    const missingLeads = leads.filter(l => !l.itemName && l.itemId)
    if (missingLeads.length === 0) return leads

    try {
      const Course = require('../../models/Course.model')
      const Subscription = require('../../models/Subscription.model')
      const itemIds = missingLeads.map(l => l.itemId)

      const [courses, subscriptions] = await Promise.all([
        Course.find({ _id: { $in: itemIds } }).select('_id title name').lean(),
        Subscription.find({ _id: { $in: itemIds } }).select('_id title name').lean()
      ])

      const courseMap = new Map(courses.map(c => [String(c._id), c.title || c.name]))
      const subMap = new Map(subscriptions.map(s => [String(s._id), s.title || s.name]))

      leads.forEach(l => {
        if (!l.itemName && l.itemId) {
          const resolved = courseMap.get(String(l.itemId)) || subMap.get(String(l.itemId))
          if (resolved) l.itemName = resolved
        }
      })
    } catch (e) {
      // Ignore resolution error
    }

    return leads
  }

  async listAll(query = {}) {
    const filter = await this.buildFilter(query)
    const direction = query.sortOrder !== undefined ? Number(query.sortOrder) : -1
    const sortBy = query.sortBy || 'createdAt'

    const result = await this.getAll(filter, {
      page: query.page,
      limit: query.limit,
      sort: { [sortBy]: direction },
      populate: { path: 'user', select: 'name email phone' }
    })

    if (result && result.data) {
      await this.resolveItemNames(result.data)
    }

    return result
  }

  async exportLeads(query = {}) {
    const filter = await this.buildFilter(query)
    const direction = query.sortOrder !== undefined ? Number(query.sortOrder) : -1
    const sortBy = query.sortBy || 'createdAt'

    const leads = await leadGenerateRepository.find(filter, {
      sort: { [sortBy]: direction },
      populate: { path: 'user', select: 'name email phone' }
    })

    await this.resolveItemNames(leads)
    return leads
  }

  async updateLead(id, data) {
    const lead = await leadGenerateRepository.findOne({ _id: id })
    if (!lead) throw new AppError('Lead not found', 404, 'NOT_FOUND')

    return leadGenerateRepository.updateById(id, { isRead: data.isRead })
  }
}

module.exports = new AdminLeadGenerateService()
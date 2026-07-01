const BaseService       = require('../../core/BaseService')
const boosterRepository = require('./booster.repository')
const { checkAccess }   = require('../../lib/access')
const AppError          = require('../../core/AppError')
const { createLogger }  = require('../../config/logger')

class BoosterService extends BaseService {
  constructor() {
    super(boosterRepository, 'booster')
    this.logger = createLogger('booster:service')
  }

  async listBoosters(filters) {
    this.logger.info({ filters }, 'Listing boosters')
    const filter = { isActive: true }
    if (filters.exam)    filter.exam    = filters.exam
    if (filters.subExam) filter.subExam = filters.subExam
    if (filters.type)    filter.type    = filters.type
    return this.getAll(filter, {
      page:   filters.page,
      limit:  filters.limit,
      select: 'exam subExam type subType title shortDescription thumbnailImage isFree price mrp sortOrder language',
    })
  }

  async getBooster(boosterId, userId) {
    this.logger.info({ boosterId, userId }, 'Fetching booster')
    const booster   = await this.getById(boosterId)
    const hasAccess = booster.isFree || await checkAccess(userId, 'booster', boosterId)
    if (!hasAccess) throw new AppError('Please purchase this booster to access', 403, 'FORBIDDEN')
    return { ...booster, hasAccess }
  }
}

module.exports = new BoosterService()

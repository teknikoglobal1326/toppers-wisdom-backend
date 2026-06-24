const BaseService       = require('../../core/BaseService')
const boosterRepository = require('./booster.repository')
const { checkAccess }   = require('../../lib/access')
const { getPresignedDownloadUrl } = require('../../lib/s3')
const AppError          = require('../../core/AppError')
const User              = require('../../models/User.model')
const { createLogger }  = require('../../config/logger')

class BoosterService extends BaseService {
  constructor() {
    super(boosterRepository, 'booster')
    this.logger = createLogger('booster:service')
  }

  async listBoosters(subExamId, filters) {
    this.logger.info({ subExamId }, 'Listing boosters')
    const filter = { subExam: subExamId, isActive: true }
    if (filters.type) filter.type = filters.type
    return this.getAll(filter, { page: filters.page, limit: filters.limit, select: 'title type language isActive' })
  }

  async getBooster(boosterId, userId) {
    this.logger.info({ boosterId, userId }, 'Fetching booster')
    const booster   = await this.getById(boosterId)
    const hasAccess = await checkAccess(userId, 'booster', boosterId)

    const items = booster.items.map((item) =>
      item.isFree || hasAccess
        ? item
        : { ...item, audioKey: undefined, pdfKey: undefined, content: undefined }
    )

    return { ...booster, items, hasAccess }
  }

  async getAudioUrl(boosterId, itemId, userId) {
    this.logger.info({ boosterId, itemId, userId }, 'Audio URL requested')
    const { booster, item } = await boosterRepository.findItemById(boosterId, itemId)
    if (!booster) throw new AppError('Booster not found', 404)
    if (!item)    throw new AppError('Item not found', 404)

    const hasAccess = item.isFree || await checkAccess(userId, 'booster', boosterId)
    if (!hasAccess) throw new AppError('Please purchase this booster to access audio', 403, 'FORBIDDEN')
    if (!item.audioKey) throw new AppError('No audio available for this item', 404)

    const url = await getPresignedDownloadUrl(item.audioKey, 900)
    this.logger.info({ boosterId, itemId }, 'Audio URL generated')
    return { url, expiresIn: 900 }
  }

  async saveItem(userId, boosterId, itemId) {
    this.logger.info({ userId, boosterId, itemId }, 'Saving booster item')
    const existing = await User.findOne({ _id: userId, 'savedItems.itemId': itemId }).lean()
    if (existing) throw new AppError('Already saved', 409, 'DUPLICATE_ERROR')
    await User.findByIdAndUpdate(userId, {
      $push: { savedItems: { itemType: 'booster_item', itemId, savedAt: new Date() } },
    })
    return { message: 'Item saved' }
  }

  async reportItem(userId, boosterId, itemId, reason) {
    this.logger.info({ userId, boosterId, itemId }, 'Reporting booster item')
    await User.findByIdAndUpdate(userId, {
      $push: { reportedItems: { itemType: 'booster_item', itemId, reason, reportedAt: new Date() } },
    })
    return { message: 'Item reported' }
  }
}

module.exports = new BoosterService()

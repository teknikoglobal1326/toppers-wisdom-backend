const BaseService = require('../../core/BaseService')
const offerRepository = require('./offer.repository')
const AppError = require('../../core/AppError')

class OfferService extends BaseService {
  constructor() {
    super(offerRepository, 'offer')
  }

  async listAll({ type, itemId, isActive, page, limit, sort = { createdAt: -1 } } = {}) {
    const filter = { isDeleted: false }
    if (type) filter.type = type
    if (itemId) filter.itemId = itemId
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true' || isActive === true
    } else {
      filter.isActive = true // Default for users: only return active offers
    }
    return this.getAll(filter, { page, limit, sort })
  }

  async getLatest({ type, itemId, isActive } = {}) {
    const filter = { isDeleted: false }
    if (type) filter.type = type
    if (itemId) filter.itemId = itemId
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true' || isActive === true
    } else {
      filter.isActive = true
    }
    return this.repository.findOne(filter, { sort: { createdAt: -1 } })
  }

  async getOne(id) {
    const offer = await offerRepository.findOne({ _id: id, isDeleted: false })
    if (!offer) throw new AppError('Offer not found', 404, 'NOT_FOUND')
    return offer
  }
}

module.exports = new OfferService()

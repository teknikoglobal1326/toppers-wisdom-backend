const path = require('path')
const BaseService = require('../../core/BaseService')
const offerRepository = require('../../modules/offer/offer.repository')
const AppError = require('../../core/AppError')
const { uploadFile } = require('../../lib/fileUpload')

const POPULATE_FIELDS = [
  { path: 'exams', select: 'name' },
  { path: 'subExams', select: 'name' },
  { path: 'subscriptions', select: 'name title price durationDays banner' },
]

class AdminOfferService extends BaseService {
  constructor() {
    super(offerRepository, 'admin:offer')
  }

  async listAll({ type, itemId, isActive, page, limit } = {}) {
    const filter = { isDeleted: false }
    if (type) filter.type = type
    if (itemId) filter.itemId = itemId
    if (isActive !== undefined && isActive !== '') {
      filter.isActive = isActive === 'true' || isActive === true
    }
    return this.getAll(filter, { page, limit, sort: { createdAt: -1 }, populate: POPULATE_FIELDS })
  }

  async getOne(id) {
    const offer = await offerRepository.findOne({ _id: id, isDeleted: false }, { populate: POPULATE_FIELDS })
    if (!offer) throw new AppError('Offer not found', 404, 'NOT_FOUND')
    return offer
  }

  async processImage(file, base64String) {
    if (file) {
      const ext = path.extname(file.originalname) || '.jpg'
      const timestamp = Date.now()
      const folder = `offers/new-${timestamp}`
      const filename = `offer-${timestamp}${ext}`
      return uploadFile(file.buffer, filename, folder, file.mimetype)
    }

    if (base64String && typeof base64String === 'string' && base64String.startsWith('data:image/')) {
      const parts = base64String.split(';base64,')
      if (parts.length === 2) {
        const mimeType = parts[0].replace('data:', '')
        const extMatch = mimeType.match(/image\/([a-zA-Z0-9-+\/]+)/)
        let ext = '.jpg'
        if (extMatch && extMatch[1]) {
           ext = `.${extMatch[1] === 'jpeg' ? 'jpg' : extMatch[1]}`
        }
        const base64Data = parts[1].replace(/\s/g, '')
        const buffer = Buffer.from(base64Data, 'base64')
        const timestamp = Date.now()
        const folder = `offers/new-${timestamp}`
        const filename = `offer-${timestamp}${ext}`
        return uploadFile(buffer, filename, folder, mimeType)
      }
    }
    return null
  }

  parseArrayField(fieldVal) {
    if (typeof fieldVal === 'string') {
      try {
        const parsed = JSON.parse(fieldVal)
        if (Array.isArray(parsed)) return parsed.filter(Boolean)
      } catch (e) {
        return fieldVal.split(',').map(s => s.trim()).filter(Boolean)
      }
    }
    if (Array.isArray(fieldVal)) return fieldVal.filter(Boolean)
    return []
  }

  async createOffer(data, file) {
    const payload = { ...data }

    if (payload.exams) payload.exams = this.parseArrayField(payload.exams)
    if (payload.subExams) payload.subExams = this.parseArrayField(payload.subExams)
    if (payload.subscriptions) payload.subscriptions = this.parseArrayField(payload.subscriptions)

    if (payload.isActive !== undefined) {
      payload.isActive = payload.isActive === 'true' || payload.isActive === true
    }

    // Check if an offer already exists for any of the selected exams or subExams
    const conflictConditions = []
    if (payload.exams && payload.exams.length > 0) {
      conflictConditions.push({ exams: { $in: payload.exams } })
    }
    if (payload.subExams && payload.subExams.length > 0) {
      conflictConditions.push({ subExams: { $in: payload.subExams } })
    }

    if (conflictConditions.length > 0) {
      const existingOffer = await offerRepository.findOne({
        isDeleted: false,
        $or: conflictConditions,
      })

      if (existingOffer) {
        throw new AppError(
          `An offer ("${existingOffer.title}") already exists for one or more selected Exams / Sub-Exams. You can only update existing offers.`,
          400,
          'DUPLICATE_OFFER'
        )
      }
    }

    const processedImage = await this.processImage(file, data.image)
    if (processedImage) {
      payload.image = processedImage
    } else if (!payload.image) {
      throw new AppError('Image is required', 400, 'BAD_REQUEST')
    }

    if (payload.type === 'course' && payload.itemId) {
      const Course = require('../../models/Course.model')
      const courseExists = await Course.exists({ _id: payload.itemId })
      if (!courseExists) throw new AppError('Associated course not found', 404, 'NOT_FOUND')
    } else if (payload.type === 'testSeries' && payload.itemId) {
      const TestSeries = require('../../models/TestSeries.model')
      const testSeriesExists = await TestSeries.exists({ _id: payload.itemId })
      if (!testSeriesExists) throw new AppError('Associated test series not found', 404, 'NOT_FOUND')
    } else if (payload.type === 'subscription' && payload.itemId) {
      const Subscription = require('../../models/Subscription.model')
      const subExists = await Subscription.exists({ _id: payload.itemId })
      if (!subExists) throw new AppError('Associated subscription not found', 404, 'NOT_FOUND')
    }

    return this.create(payload)
  }

  async updateOffer(id, data, file) {
    const offer = await offerRepository.findOne({ _id: id, isDeleted: false }, { populate: POPULATE_FIELDS })
    if (!offer) throw new AppError('Offer not found', 404, 'NOT_FOUND')

    const payload = { ...data }

    if (payload.exams) payload.exams = this.parseArrayField(payload.exams)
    if (payload.subExams) payload.subExams = this.parseArrayField(payload.subExams)
    if (payload.subscriptions) payload.subscriptions = this.parseArrayField(payload.subscriptions)

    if (payload.isActive !== undefined) {
      payload.isActive = payload.isActive === 'true' || payload.isActive === true
    }

    const targetExams = payload.exams || offer.exams || []
    const targetSubExams = payload.subExams || offer.subExams || []

    const conflictConditions = []
    if (targetExams.length > 0) {
      conflictConditions.push({ exams: { $in: targetExams } })
    }
    if (targetSubExams.length > 0) {
      conflictConditions.push({ subExams: { $in: targetSubExams } })
    }

    if (conflictConditions.length > 0) {
      const existingOffer = await offerRepository.findOne({
        _id: { $ne: id },
        isDeleted: false,
        $or: conflictConditions,
      })

      if (existingOffer) {
        throw new AppError(
          `Another offer ("${existingOffer.title}") already exists for one or more selected Exams / Sub-Exams.`,
          400,
          'DUPLICATE_OFFER'
        )
      }
    }

    const processedImage = await this.processImage(file, data.image)
    if (processedImage) {
      payload.image = processedImage
    }

    if (payload.type || payload.itemId) {
      const type = payload.type || offer.type
      const itemId = payload.itemId || offer.itemId

      if (type === 'course' && itemId) {
        const Course = require('../../models/Course.model')
        const courseExists = await Course.exists({ _id: itemId })
        if (!courseExists) throw new AppError('Associated course not found', 404, 'NOT_FOUND')
      } else if (type === 'testSeries' && itemId) {
        const TestSeries = require('../../models/TestSeries.model')
        const testSeriesExists = await TestSeries.exists({ _id: itemId })
        if (!testSeriesExists) throw new AppError('Associated test series not found', 404, 'NOT_FOUND')
      } else if (type === 'subscription' && itemId) {
        const Subscription = require('../../models/Subscription.model')
        const subExists = await Subscription.exists({ _id: itemId })
        if (!subExists) throw new AppError('Associated subscription not found', 404, 'NOT_FOUND')
      }
    }

    return offerRepository.updateById(id, payload)
  }

  async softDelete(id) {
    const offer = await offerRepository.findOne({ _id: id, isDeleted: false }, { populate: POPULATE_FIELDS })
    if (!offer) throw new AppError('Offer not found', 404, 'NOT_FOUND')
    await offerRepository.updateById(id, { isDeleted: true })
    this.logger.info({ offerId: id }, 'Offer soft deleted')
  }

  async hardDelete(id) {
    const offer = await offerRepository.findOne({ _id: id })
    if (!offer) throw new AppError('Offer not found', 404, 'NOT_FOUND')
    await offerRepository.deleteById(id)
    this.logger.info({ offerId: id }, 'Offer permanently deleted')
  }
}

module.exports = new AdminOfferService()
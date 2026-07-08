const path           = require('path')
const BaseService    = require('../../core/BaseService')
const bannerRepository = require('../../modules/banner/banner.repository')
const AppError       = require('../../core/AppError')
const { uploadFile } = require('../../lib/fileUpload')
const {
  getExactLanguageFilter,
  isDualLanguagePayload,
  makeLanguageRecords,
} = require('../../core/languageUtils')

class AdminBannerService extends BaseService {
  constructor() {
    super(bannerRepository, 'admin:banner')
  }

  async listAll({ examId, subexamId, status, language, sortOrder, page, limit } = {}) {
    const filter = { isDeleted: false }
    if (examId)    filter.examId    = examId
    if (subexamId) filter.subexamId = subexamId
    if (status)    filter.status    = status
    const exactLanguage = getExactLanguageFilter(language)
    if (exactLanguage) filter.language = exactLanguage
    const direction = sortOrder === 'desc' ? -1 : 1
    return this.getAll(filter, { page, limit, sort: { sortOrder: direction, createdAt: -1 } })
  }

  async getOne(id) {
    const banner = await bannerRepository.findOne({ _id: id, isDeleted: false })
    if (!banner) throw new AppError('Banner not found', 404, 'NOT_FOUND')
    return banner
  }

  async uploadImage(file) {
    if (!file) return null
    const ext      = path.extname(file.originalname) || '.jpg'
    const filename = `${Date.now()}${ext}`
    return uploadFile(file.buffer, filename, 'banners', file.mimetype)
  }

  async createBanner(data, files = {}) {
    if (isDualLanguagePayload(data)) {
      const [hiImage, enImage] = await Promise.all([
        this.uploadImage(files.hiImage?.[0]),
        this.uploadImage(files.enImage?.[0]),
      ])

      const records = makeLanguageRecords(data).map((record) => {
        const image = record.language === 'hi' ? hiImage : enImage
        return {
          ...record,
          ...(image ? { image } : {}),
        }
      })
      return bannerRepository.insertMany(records)
    }

    const payload = { ...data }
    if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
      const parsedSortOrder = Number(payload.sortOrder)
      if (!Number.isNaN(parsedSortOrder)) payload.sortOrder = parsedSortOrder
    }
    const image = await this.uploadImage(files.image?.[0])
    if (image) payload.image = image
    return this.create(payload)
  }

  async updateBanner(id, data, file) {
    const banner = await bannerRepository.findOne({ _id: id, isDeleted: false })
    if (!banner) throw new AppError('Banner not found', 404, 'NOT_FOUND')
    const payload = { ...data }
    if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
      const parsedSortOrder = Number(payload.sortOrder)
      if (!Number.isNaN(parsedSortOrder)) payload.sortOrder = parsedSortOrder
    }
    if (file) {
      const ext      = path.extname(file.originalname) || '.jpg'
      const filename = `${Date.now()}${ext}`
      payload.image  = await uploadFile(file.buffer, filename, 'banners', file.mimetype)
    }
    return bannerRepository.updateById(id, payload)
  }

  async softDelete(id) {
    const banner = await bannerRepository.findOne({ _id: id, isDeleted: false })
    if (!banner) throw new AppError('Banner not found', 404, 'NOT_FOUND')
    await bannerRepository.updateById(id, { isDeleted: true })
    this.logger.info({ bannerId: id }, 'Banner soft deleted')
  }
}

module.exports = new AdminBannerService()

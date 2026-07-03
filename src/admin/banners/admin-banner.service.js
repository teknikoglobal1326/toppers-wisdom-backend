const path           = require('path')
const BaseService    = require('../../core/BaseService')
const bannerRepository = require('../../modules/banner/banner.repository')
const AppError       = require('../../core/AppError')
const { uploadFile } = require('../../lib/fileUpload')
const { createWithLanguage } = require('../../core/createWithLanguage')

class AdminBannerService extends BaseService {
  constructor() {
    super(bannerRepository, 'admin:banner')
  }

  async listAll({ examId, subexamId, status, page, limit } = {}) {
    const filter = { isDeleted: false }
    if (examId)    filter.examId    = examId
    if (subexamId) filter.subexamId = subexamId
    if (status)    filter.status    = status
    return this.getAll(filter, { page, limit, sort: { createdAt: -1 } })
  }

  async getOne(id) {
    const banner = await bannerRepository.findOne({ _id: id, isDeleted: false })
    if (!banner) throw new AppError('Banner not found', 404, 'NOT_FOUND')
    return banner
  }

  async createBanner(data, file) {
    const payload = { ...data }
    if (file) {
      const ext      = path.extname(file.originalname) || '.jpg'
      const filename = `${Date.now()}${ext}`
      payload.image  = await uploadFile(file.buffer, filename, 'banners', file.mimetype)
    }
    return createWithLanguage((d) => this.create(d), payload)
  }

  async updateBanner(id, data, file) {
    const banner = await bannerRepository.findOne({ _id: id, isDeleted: false })
    if (!banner) throw new AppError('Banner not found', 404, 'NOT_FOUND')
    const payload = { ...data }
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
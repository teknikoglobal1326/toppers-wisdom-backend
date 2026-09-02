const path = require('path')
const BaseService = require('../../core/BaseService')
const bannerRepository = require('../../modules/banner/banner.repository')
const AppError = require('../../core/AppError')
const { uploadFile } = require('../../lib/fileUpload')
const {
  getExactLanguageFilter,
} = require('../../core/languageUtils')

class AdminBannerService extends BaseService {
  constructor() {
    super(bannerRepository, 'admin:banner')
  }

  async listAll({ examId, subexamId, status, language, sortOrder, page, limit, search } = {}) {
    const filter = { isDeleted: false }
    if (examId) filter.examId = examId
    if (subexamId) filter.subexamId = subexamId
    if (status) filter.status = status
    if (search) filter.name = new RegExp(search, 'i')
    const exactLanguage = getExactLanguageFilter(language)
    if (exactLanguage) filter.language = exactLanguage
    const direction = sortOrder === 'desc' ? -1 : 1
    return this.getAll(filter, { page, limit, sort: { sortOrder: direction, createdAt: -1 }, populate: 'examId subexamId subscriptionId courseId' })
  }

  async getOne(id) {
    const banner = await bannerRepository.findOne({ _id: id, isDeleted: false })
    if (!banner) throw new AppError('Banner not found', 404, 'NOT_FOUND')
    return banner
  }

  async processImage(file, base64String) {
    if (file) {
      const ext = path.extname(file.originalname) || '.jpg'
      const timestamp = Date.now()
      const folder = `banners/new-${timestamp}`
      const filename = `banner-${timestamp}${ext}`
      return uploadFile(file.buffer, filename, folder, file.mimetype)
    }

    if (base64String && typeof base64String === 'string' && base64String.startsWith('data:image/')) {
      const parts = base64String.split(';base64,')
      if (parts.length === 2) {
        const mimeType = parts[0].replace('data:', '')
        const extMatch = mimeType.match(/image\/([a-zA-Z0-9-+/]+)/)
        let ext = '.jpg'
        if (extMatch && extMatch[1]) {
           ext = `.${extMatch[1] === 'jpeg' ? 'jpg' : extMatch[1]}`
        }
        // base64 strings might contain spaces if URL decoded poorly
        const base64Data = parts[1].replace(/\s/g, '')
        const buffer = Buffer.from(base64Data, 'base64')
        const timestamp = Date.now()
        const folder = `banners/new-${timestamp}`
        const filename = `banner-${timestamp}${ext}`
        return uploadFile(buffer, filename, folder, mimeType)
      }
    }
    return null
  }

  async createBanner(data, file) {
    const payload = { ...data }
    if (payload.examId === '' || payload.examId === 'null' || payload.examId === 'undefined') payload.examId = null
    if (payload.subexamId === '' || payload.subexamId === 'null' || payload.subexamId === 'undefined') payload.subexamId = null
    if (payload.subscriptionId === '' || payload.subscriptionId === 'null' || payload.subscriptionId === 'undefined') payload.subscriptionId = null
    if (payload.courseId === '' || payload.courseId === 'null' || payload.courseId === 'undefined') payload.courseId = null

    // Apply type logic
    if (payload.type === 'external') {
      payload.subscriptionId = null
      payload.courseId = null
    } else if (payload.type === 'subscription') {
      payload.url = null
      payload.courseId = null
    } else if (payload.type === 'course') {
      payload.url = null
      payload.subscriptionId = null
    }
    
    if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
      const parsedSortOrder = Number(payload.sortOrder)
      if (!Number.isNaN(parsedSortOrder)) payload.sortOrder = parsedSortOrder
    }
    const processedImage = await this.processImage(file, data.image)
    if (processedImage) {
      payload.image = processedImage
    } else if (payload.image && typeof payload.image === 'string' && payload.image.startsWith('data:image/')) {
      delete payload.image
    }
    return this.create(payload)
  }

  async updateBanner(id, data, file) {
    const banner = await bannerRepository.findOne({ _id: id, isDeleted: false })
    if (!banner) throw new AppError('Banner not found', 404, 'NOT_FOUND')
    const payload = { ...data }
    
    if (payload.examId === '' || payload.examId === 'null' || payload.examId === 'undefined') payload.examId = null
    if (payload.subexamId === '' || payload.subexamId === 'null' || payload.subexamId === 'undefined') payload.subexamId = null
    if (payload.subscriptionId === '' || payload.subscriptionId === 'null' || payload.subscriptionId === 'undefined') payload.subscriptionId = null
    if (payload.courseId === '' || payload.courseId === 'null' || payload.courseId === 'undefined') payload.courseId = null

    // Determine type (from payload or fallback to existing banner)
    const activeType = payload.type || banner.type

    // Apply type logic
    if (activeType === 'external') {
      payload.subscriptionId = null
      payload.courseId = null
      if (payload.url === '') payload.url = null
    } else if (activeType === 'subscription') {
      payload.url = null
      payload.courseId = null
    } else if (activeType === 'course') {
      payload.url = null
      payload.subscriptionId = null
    }

    if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
      const parsedSortOrder = Number(payload.sortOrder)
      if (!Number.isNaN(parsedSortOrder)) payload.sortOrder = parsedSortOrder
    }
    const processedImage = await this.processImage(file, data.image)
    if (processedImage) {
      payload.image = processedImage
    } else if (payload.image && typeof payload.image === 'string' && payload.image.startsWith('data:image/')) {
      delete payload.image
    }
    return bannerRepository.updateById(id, payload)
  }

  async softDelete(id) {
    const banner = await bannerRepository.findOne({ _id: id, isDeleted: false })
    if (!banner) throw new AppError('Banner not found', 404, 'NOT_FOUND')
    await bannerRepository.updateById(id, { isDeleted: true })
    this.logger.info({ bannerId: id }, 'Banner soft deleted')
  }

  async hardDelete(id) {
    const banner = await bannerRepository.findOne({ _id: id })
    if (!banner) throw new AppError('Banner not found', 404, 'NOT_FOUND')
    await bannerRepository.deleteById(id)
    this.logger.info({ bannerId: id }, 'Banner permanently deleted')
  }
}

module.exports = new AdminBannerService()

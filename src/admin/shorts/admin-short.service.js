const path = require('path')
const BaseService = require('../../core/BaseService')
const shortRepository = require('../../modules/short/short.repository')
const AppError = require('../../core/AppError')
const { uploadFile } = require('../../lib/fileUpload')
const { createWithLanguage } = require('../../core/createWithLanguage')

class AdminShortService extends BaseService {
  constructor() {
    super(shortRepository, 'admin:short')
  }

  async listAll({ examId, subexamId, status, sortOrder, page, limit } = {}) {
    const filter = { isDeleted: false }
    if (examId) filter.examId = examId
    if (subexamId) filter.subexamId = subexamId
    if (status) filter.status = status
    const direction = sortOrder === 'desc' ? -1 : 1
    return this.getAll(filter, { page, limit, sort: { sortOrder: direction, createdAt: -1 } })
  }

  async getOne(id) {
    const short = await shortRepository.findOne({ _id: id, isDeleted: false })
    if (!short) throw new AppError('Short not found', 404, 'NOT_FOUND')
    return short
  }

  async createShort(data, files = {}) {
    const payload = { ...data }
    if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
      const parsedSortOrder = Number(payload.sortOrder)
      if (!Number.isNaN(parsedSortOrder)) payload.sortOrder = parsedSortOrder
    }
    if (!payload.videoUrl && files.video?.[0]) {
      const v = files.video[0]
      payload.videoUrl = await uploadFile(v.buffer, `${Date.now()}${path.extname(v.originalname) || '.mp4'}`, 'shorts', v.mimetype)
    }
    if (!payload.thumbnail && files.thumbnail?.[0]) {
      const t = files.thumbnail[0]
      payload.thumbnail = await uploadFile(t.buffer, `${Date.now()}-thumb${path.extname(t.originalname) || '.jpg'}`, 'shorts/thumbnails', t.mimetype)
    }
    return createWithLanguage((d) => this.create(d), payload)
  }

  async createShortDual({ hi, en }) {
    const [hiResult, enResult] = await Promise.all([
      this.create({ ...hi, language: 'hi' }),
      this.create({ ...en, language: 'en' }),
    ])
    return [hiResult, enResult]
  }

  async updateShort(id, data, files = {}) {
    const short = await shortRepository.findOne({ _id: id, isDeleted: false })
    if (!short) throw new AppError('Short not found', 404, 'NOT_FOUND')
    const payload = { ...data }
    if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
      const parsedSortOrder = Number(payload.sortOrder)
      if (!Number.isNaN(parsedSortOrder)) payload.sortOrder = parsedSortOrder
    }
    if (!payload.videoUrl && files.video?.[0]) {
      const v = files.video[0]
      payload.videoUrl = await uploadFile(v.buffer, `${Date.now()}${path.extname(v.originalname) || '.mp4'}`, 'shorts', v.mimetype)
    }
    if (!payload.thumbnail && files.thumbnail?.[0]) {
      const t = files.thumbnail[0]
      payload.thumbnail = await uploadFile(t.buffer, `${Date.now()}-thumb${path.extname(t.originalname) || '.jpg'}`, 'shorts/thumbnails', t.mimetype)
    }
    return shortRepository.updateById(id, payload)
  }

  async softDelete(id) {
    const short = await shortRepository.findOne({ _id: id, isDeleted: false })
    if (!short) throw new AppError('Short not found', 404, 'NOT_FOUND')
    await shortRepository.updateById(id, { isDeleted: true })
    this.logger.info({ shortId: id }, 'Short soft deleted')
  }
}

module.exports = new AdminShortService()

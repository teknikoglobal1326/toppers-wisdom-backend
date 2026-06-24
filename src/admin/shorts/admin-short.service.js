const path = require('path')
const BaseService = require('../../core/BaseService')
const shortRepository = require('../../modules/short/short.repository')
const AppError = require('../../core/AppError')
const { uploadFile } = require('../../lib/fileUpload')

class AdminShortService extends BaseService {
  constructor() {
    super(shortRepository, 'admin:short')
  }

  async listAll({ examId, subexamId, status, page, limit } = {}) {
    const filter = { isDeleted: false }
    if (examId) filter.examId = examId
    if (subexamId) filter.subexamId = subexamId
    if (status) filter.status = status
    return this.getAll(filter, { page, limit, sort: { createdAt: -1 } })
  }

  async getOne(id) {
    const short = await shortRepository.findOne({ _id: id, isDeleted: false })
    if (!short) throw new AppError('Short not found', 404, 'NOT_FOUND')
    return short
  }

  async createShort(data, files = {}) {
    const payload = { ...data }
    if (files.video?.[0]) {
      const v = files.video[0]
      payload.videoUrl = await uploadFile(v.buffer, `${Date.now()}${path.extname(v.originalname) || '.mp4'}`, 'shorts', v.mimetype)
    }
    if (files.thumbnail?.[0]) {
      const t = files.thumbnail[0]
      payload.thumbnail = await uploadFile(t.buffer, `${Date.now()}-thumb${path.extname(t.originalname) || '.jpg'}`, 'shorts/thumbnails', t.mimetype)
    }
    return this.create(payload)
  }

  async updateShort(id, data, files = {}) {
    const short = await shortRepository.findOne({ _id: id, isDeleted: false })
    if (!short) throw new AppError('Short not found', 404, 'NOT_FOUND')
    const payload = { ...data }
    if (files.video?.[0]) {
      const v = files.video[0]
      payload.videoUrl = await uploadFile(v.buffer, `${Date.now()}${path.extname(v.originalname) || '.mp4'}`, 'shorts', v.mimetype)
    }
    if (files.thumbnail?.[0]) {
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

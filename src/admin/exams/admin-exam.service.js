const path = require('path')
const BaseService = require('../../core/BaseService')
const examRepository = require('../../modules/exam/exam.repository')
const AppError = require('../../core/AppError')
const { uploadFile } = require('../../lib/fileUpload')
const { createLogger } = require('../../config/logger')
const {
  getExactLanguageFilter,
  isDualLanguagePayload,
  makeLanguageRecords,
} = require('../../core/languageUtils')

class AdminExamService extends BaseService {
  constructor() {
    super(examRepository, 'admin:exam')
    this.logger = createLogger('admin:exam:service')
  }

  async listAll({ status, language, sortOrder, page, limit } = {}) {
    const filter = { is_deleted: false }
    if (status) filter.status = status
    const exactLanguage = getExactLanguageFilter(language)
    if (exactLanguage) filter.language = exactLanguage
    const direction = sortOrder === 'desc' ? -1 : 1
    return this.getAll(filter, { page, limit, sort: { sortOrder: direction, createdAt: -1 } })
  }

  async getOne(id) {
    const exam = await examRepository.findOne({ _id: id, is_deleted: false })
    if (!exam) throw new AppError('Exam not found', 404, 'NOT_FOUND')
    return exam
  }

  async uploadImage(file) {
    if (!file) return null
    const ext = path.extname(file.originalname) || '.jpg'
    const filename = `${Date.now()}${ext}`
    return uploadFile(file.buffer, filename, 'exams', file.mimetype)
  }

  async createExam(data, files = {}) {
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
      return examRepository.insertMany(records)
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

  async updateExam(id, data, file) {
    const exam = await examRepository.findOne({ _id: id, is_deleted: false })
    if (!exam) throw new AppError('Exam not found', 404, 'NOT_FOUND')
    const payload = { ...data }
    if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
      const parsedSortOrder = Number(payload.sortOrder)
      if (!Number.isNaN(parsedSortOrder)) payload.sortOrder = parsedSortOrder
    }
    if (file) {
      const ext = path.extname(file.originalname) || '.jpg'
      const filename = `${Date.now()}${ext}`
      payload.image = await uploadFile(file.buffer, filename, 'exams', file.mimetype)
    }
    return examRepository.updateById(id, payload)
  }

  async softDelete(id) {
    const exam = await examRepository.findOne({ _id: id, is_deleted: false })
    if (!exam) throw new AppError('Exam not found', 404, 'NOT_FOUND')
    await examRepository.updateById(id, { is_deleted: true })
    this.logger.info({ examId: id }, 'Exam soft deleted')
  }
}

module.exports = new AdminExamService()

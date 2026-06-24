const path = require('path')
const BaseService    = require('../../core/BaseService')
const examRepository = require('../../modules/exam/exam.repository')
const AppError       = require('../../core/AppError')
const { uploadFile } = require('../../lib/fileUpload')
const { createLogger } = require('../../config/logger')

class AdminExamService extends BaseService {
  constructor() {
    super(examRepository, 'admin:exam')
    this.logger = createLogger('admin:exam:service')
  }

  async listAll({ status, page, limit } = {}) {
    const filter = { is_deleted: false }
    if (status) filter.status = status
    return this.getAll(filter, { page, limit, sort: { createdAt: -1 } })
  }

  async getOne(id) {
    const exam = await examRepository.findOne({ _id: id, is_deleted: false })
    if (!exam) throw new AppError('Exam not found', 404, 'NOT_FOUND')
    return exam
  }

  async createExam(data, file) {
    const payload = { ...data }
    if (file) {
      const ext      = path.extname(file.originalname) || '.jpg'
      const filename = `${Date.now()}${ext}`
      payload.image  = await uploadFile(file.buffer, filename, 'exams', file.mimetype)
    }
    return this.create(payload)
  }

  async updateExam(id, data, file) {
    const exam = await examRepository.findOne({ _id: id, is_deleted: false })
    if (!exam) throw new AppError('Exam not found', 404, 'NOT_FOUND')
    const payload = { ...data }
    if (file) {
      const ext      = path.extname(file.originalname) || '.jpg'
      const filename = `${Date.now()}${ext}`
      payload.image  = await uploadFile(file.buffer, filename, 'exams', file.mimetype)
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

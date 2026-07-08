const BaseService        = require('../../core/BaseService')
const subjectRepository  = require('../../modules/subject/subject.repository')
const AppError           = require('../../core/AppError')
const { createWithLanguage } = require('../../core/createWithLanguage')

class AdminSubjectService extends BaseService {
  constructor() {
    super(subjectRepository, 'admin:subject')
  }

  async listAll({ status, sortOrder, page, limit } = {}) {
    const filter = { isDeleted: false }
    if (status) filter.status = status
    const direction = sortOrder === 'desc' ? -1 : 1
    return this.getAll(filter, { page, limit, sort: { sortOrder: direction, createdAt: -1 } })
  }

  async getOne(id) {
    const subject = await subjectRepository.findOne({ _id: id, isDeleted: false })
    if (!subject) throw new AppError('Subject not found', 404, 'NOT_FOUND')
    return subject
  }

  async createSubject(data) {
    const payload = { ...data }
    if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
      const parsedSortOrder = Number(payload.sortOrder)
      if (!Number.isNaN(parsedSortOrder)) payload.sortOrder = parsedSortOrder
    }
    return createWithLanguage((d) => this.create(d), payload)
  }

  async createSubjectDual({ hi, en }) {
    const [hiResult, enResult] = await Promise.all([
      this.create({ ...hi, language: 'hi' }),
      this.create({ ...en, language: 'en' }),
    ])
    return [hiResult, enResult]
  }

  async updateSubject(id, data) {
    const subject = await subjectRepository.findOne({ _id: id, isDeleted: false })
    if (!subject) throw new AppError('Subject not found', 404, 'NOT_FOUND')
    const payload = { ...data }
    if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
      const parsedSortOrder = Number(payload.sortOrder)
      if (!Number.isNaN(parsedSortOrder)) payload.sortOrder = parsedSortOrder
    }
    return subjectRepository.updateById(id, payload)
  }

  async softDelete(id) {
    const subject = await subjectRepository.findOne({ _id: id, isDeleted: false })
    if (!subject) throw new AppError('Subject not found', 404, 'NOT_FOUND')
    await subjectRepository.updateById(id, { isDeleted: true })
    this.logger.info({ subjectId: id }, 'Subject soft deleted')
  }
}

module.exports = new AdminSubjectService()

const BaseService        = require('../../core/BaseService')
const subjectRepository  = require('../../modules/subject/subject.repository')
const AppError           = require('../../core/AppError')

class AdminSubjectService extends BaseService {
  constructor() {
    super(subjectRepository, 'admin:subject')
  }

  async listAll({ status, page, limit } = {}) {
    const filter = { isDeleted: false }
    if (status) filter.status = status
    return this.getAll(filter, { page, limit, sort: { createdAt: -1 } })
  }

  async getOne(id) {
    const subject = await subjectRepository.findOne({ _id: id, isDeleted: false })
    if (!subject) throw new AppError('Subject not found', 404, 'NOT_FOUND')
    return subject
  }

  async createSubject(data) {
    return this.create(data)
  }

  async updateSubject(id, data) {
    const subject = await subjectRepository.findOne({ _id: id, isDeleted: false })
    if (!subject) throw new AppError('Subject not found', 404, 'NOT_FOUND')
    return subjectRepository.updateById(id, data)
  }

  async softDelete(id) {
    const subject = await subjectRepository.findOne({ _id: id, isDeleted: false })
    if (!subject) throw new AppError('Subject not found', 404, 'NOT_FOUND')
    await subjectRepository.updateById(id, { isDeleted: true })
    this.logger.info({ subjectId: id }, 'Subject soft deleted')
  }
}

module.exports = new AdminSubjectService()

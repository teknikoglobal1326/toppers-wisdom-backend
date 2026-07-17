const BaseService = require('../../core/BaseService')
const qualificationRepository = require('./qualification.repository')
const { createLogger } = require('../../config/logger')

class QualificationService extends BaseService {
  constructor() {
    super(qualificationRepository, 'qualification')
    this.logger = createLogger('qualification:service')
  }

  async listAll() {
    this.logger.info('Listing all qualifications')
    return this.getAll({ isActive: true, isDelted: false }, { sort: { sortOrder: 1 }, limit: 100 })
  }

  async listPublic() {
    this.logger.info('Listing public qualifications')
    return this.repository.findAll(
      { isActive: true },
      { sort: { sortOrder: 1 }, select: '_id name' },
    )
  }

  async getExamTypes(qualificationId) {
    this.logger.info({ qualificationId }, 'Fetching exam types')
    await this.repository.findOneOrFail({ _id: qualificationId, isDelted: false }, 'Qualification not found')
    return qualificationRepository.getActiveExamTypes(qualificationId)
  }

  async getSubExams(examTypeId) {
    this.logger.info({ examTypeId }, 'Fetching sub-exams')
    return qualificationRepository.getActiveSubExams(examTypeId)
  }
}

module.exports = new QualificationService()
